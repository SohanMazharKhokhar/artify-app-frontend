import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Pressable, TextInput, StyleSheet, Dimensions, Alert, ActivityIndicator } from 'react-native';
import { GLView } from 'expo-gl'; // For Three.js rendering
import * as THREE from 'three';
import { Asset } from 'expo-asset'; // For loading local assets like GLB models
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'; // Requires specific Three.js setup for Expo
import Canvas from 'react-native-canvas'; // For 2D drawing context

const { width, height } = Dimensions.get('window');

export default function MugCustomizer() {
  const glRef = useRef(null); // Ref for Expo.GLView context
  const canvas2DRef = useRef(null); // Ref for react-native-canvas for the texture
  const [currentTool, setCurrentTool] = useState('freehand');
  const [currentColor, setCurrentColor] = useState('#0000ff');
  const [brushSize, setBrushSize] = useState(5);
  const [isHollow, setIsHollow] = useState(false);

  const [isRotating, setIsRotating] = useState(false);
  const isRotatingLogicRef = useRef(false);

  const [textInput, setTextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false); // State for loading indicator

  // Drawing state refs
  const drawingsRef = useRef([]);
  const isDrawingRef = useRef(false);
  const isMovingRef = useRef(false);
  const selectedShapeRef = useRef(null);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastMouseXRef = useRef(0);
  const lastMouseYRef = useRef(0);
  const dragOffsetXRef = useRef(0);
  const dragOffsetYRef = useRef(0);

  // Three.js refs
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const modelRef = useRef(null);
  // mugTextureCanvasRef and ctxRef are replaced by canvas2DRef and its context
  const textureRef = useRef(null);
  const animationRef = useRef(null);

  // --- Undo/Redo State and Functions ---
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const saveStateForUndo = useCallback(() => {
    // For images, we store the URI since Canvas.Image objects cannot be directly serialized.
    const serializableDrawings = drawingsRef.current.map(drawing => {
      if (drawing.type === 'image') {
        return { ...drawing, imgUri: drawing.img.src }; // Assuming img.src holds the URI
      }
      return drawing;
    });
    setUndoStack(prev => [...prev, serializableDrawings]);
    setRedoStack([]);
  }, []);

  const redrawCanvas = useCallback(() => {
    const ctx = canvas2DRef.current?.getContext('2d');
    const canvas = canvas2DRef.current;
    if (!ctx || !canvas) return;

    // Clear and fill with white background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Redraw all stored shapes
    drawingsRef.current.forEach(shape => {
      if (shape.type === 'path') {
        drawPath(shape);
      } else if (shape.type === 'rectangle') {
        drawRectangle(shape);
      } else if (shape.type === 'circle') {
        drawCircle(shape);
      } else if (shape.type === 'text') {
        drawText(shape);
      } else if (shape.type === 'image') {
        drawImage(shape);
      }
    });

    // Draw active shape preview (rectangle/circle)
    if (isDrawingRef.current) {
      ctx.strokeStyle = currentColor;
      ctx.lineWidth = brushSize;
      ctx.setLineDash([5, 5]); // Dashed line for preview
      ctx.beginPath();

      if (currentTool === 'rectangle') {
        const width = lastMouseXRef.current - startXRef.current;
        const height = lastMouseYRef.current - startYRef.current;
        ctx.rect(startXRef.current, startYRef.current, width, height);
        ctx.stroke();
      } else if (currentTool === 'circle') {
        const radius = Math.sqrt(
          Math.pow(lastMouseXRef.current - startXRef.current, 2) +
          Math.pow(lastMouseYRef.current - startYRef.current, 2)
        );
        ctx.arc(startXRef.current, startYRef.current, radius, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset line dash
    }

    // Update Three.js texture if it exists
    if (textureRef.current) {
      textureRef.current.needsUpdate = true;
    }
  }, [currentColor, brushSize, currentTool]); // Depend on relevant state for redraw

  const handleUndo = useCallback(() => {
    if (undoStack.length > 0) {
      const currentDrawingsSerializable = drawingsRef.current.map(drawing => {
        if (drawing.type === 'image') {
          return { ...drawing, imgUri: drawing.img.src };
        }
        return drawing;
      });
      setRedoStack(prev => [...prev, currentDrawingsSerializable]);

      const previousState = undoStack[undoStack.length - 1];
      setUndoStack(prev => prev.slice(0, prev.length - 1));

      // Re-create Image objects for react-native-canvas
      const restoredDrawings = previousState.map(drawing => {
        if (drawing.type === 'image') {
          const img = new Canvas.Image(canvas2DRef.current);
          img.src = drawing.imgUri; // Use the stored URI
          img.width = drawing.width;
          img.height = drawing.height;
          img.addEventListener('load', redrawCanvas); // Redraw once image is loaded
          return { ...drawing, img: img };
        }
        return drawing;
      });
      drawingsRef.current = restoredDrawings;
      redrawCanvas();
    }
  }, [undoStack, redrawCanvas]);

  const handleRedo = useCallback(() => {
    if (redoStack.length > 0) {
      const currentDrawingsSerializable = drawingsRef.current.map(drawing => {
        if (drawing.type === 'image') {
          return { ...drawing, imgUri: drawing.img.src };
        }
        return drawing;
      });
      setUndoStack(prev => [...prev, currentDrawingsSerializable]);

      const nextState = redoStack[redoStack.length - 1];
      setRedoStack(prev => prev.slice(0, prev.length - 1));

      // Re-create Image objects for react-native-canvas
      const restoredDrawings = nextState.map(drawing => {
        if (drawing.type === 'image') {
          const img = new Canvas.Image(canvas2DRef.current);
          img.src = drawing.imgUri;
          img.width = drawing.width;
          img.height = drawing.height;
          img.addEventListener('load', redrawCanvas);
          return { ...drawing, img: img };
        }
        return drawing;
      });
      drawingsRef.current = restoredDrawings;
      redrawCanvas();
    }
  }, [redoStack, redrawCanvas]);
  // --- End Undo/Redo State and Functions ---


  // --- Drawing Functions ---
  const drawPath = (path) => {
    if (path.points.length < 2) return;
    const ctx = canvas2DRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(path.points[0].x, path.points[0].y);
    for (let i = 1; i < path.points.length; i++) {
      ctx.lineTo(path.points[i].x, path.points[i].y);
    }
    ctx.strokeStyle = path.color;
    ctx.lineWidth = path.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const drawRectangle = (rect) => {
    const ctx = canvas2DRef.current.getContext('2d');
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.width, rect.height);
    if (rect.isHollow) {
      ctx.strokeStyle = rect.color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    } else {
      ctx.fillStyle = rect.color;
      ctx.fill();
    }
    if (rect.selected) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawCircle = (circle) => {
    const ctx = canvas2DRef.current.getContext('2d');
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    if (circle.isHollow) {
      ctx.strokeStyle = circle.color;
      ctx.lineWidth = brushSize;
      ctx.stroke();
    } else {
      ctx.fillStyle = circle.color;
      ctx.fill();
    }
    if (circle.selected) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  };

  const drawText = (textObj) => {
    const ctx = canvas2DRef.current.getContext('2d');
    ctx.save();
    ctx.font = `${textObj.size}px Arial`; // Font handling might be limited in react-native-canvas
    ctx.fillStyle = textObj.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(textObj.text, textObj.x, textObj.y);
    if (textObj.selected) {
      // react-native-canvas's measureText might be different or unavailable.
      // Using a rough approximation for bounding box.
      const estimatedWidth = textObj.text.length * (textObj.size * 0.6);
      const estimatedHeight = textObj.size;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(textObj.x, textObj.y - estimatedHeight, estimatedWidth, estimatedHeight);
      ctx.setLineDash([]);
    }
    ctx.restore();
  };

  const drawImage = (imgObj) => {
    const ctx = canvas2DRef.current.getContext('2d');
    if (imgObj.img) { // imgObj.img is already a Canvas.Image instance
      // The `complete` property isn't directly available or reliable for Canvas.Image.
      // We rely on the `load` event during image creation.
      ctx.drawImage(imgObj.img, imgObj.x, imgObj.y, imgObj.width, imgObj.height);
    } else {
      console.warn("Image object not found for drawing:", imgObj);
    }
    if (imgObj.selected) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(imgObj.x, imgObj.y, imgObj.width, imgObj.height);
      ctx.setLineDash([]);
    }
  };
  // --- End Drawing Functions ---


  // --- Three.js Initialization ---
  const onContextCreate = useCallback(async (gl) => {
    glRef.current = gl;

    // Initialize Three.js scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    // Use Dimensions.get('window') for camera aspect ratio and renderer size
    const currentWidth = Dimensions.get('window').width;
    const currentHeight = Dimensions.get('window').height;
    const camera = new THREE.PerspectiveCamera(75, currentWidth / currentHeight, 0.1, 1000);
    camera.position.set(0, 1, 5);
    cameraRef.current = camera;

    // Use WebGL1Renderer for better compatibility with Expo GL
    const renderer = new WebGL1Renderer({
      context: gl,
      powerPreference: "high-performance",
      antialias: true,
      // The canvas property is automatically handled by expo-gl context
    });
    renderer.setSize(currentWidth, currentHeight);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(2, 2, 2).normalize();
    scene.add(directionalLight);

    // Load mug model using Expo Asset system
    // IMPORTANT: Make sure 'nescafe_mug.glb' is in your Expo project's assets folder
    // (e.g., /assets/models/nescafe_mug.glb)
    const mugAsset = Asset.fromModule(require('./assets/models/nescafe_mug.glb'));
    await mugAsset.downloadAsync(); // Ensure asset is downloaded before loading

    const loader = new GLTFLoader();
    // GLTFLoader expects a URL or path, use the local URI from Expo Asset
    loader.load(mugAsset.localUri || mugAsset.uri, (gltf) => {
      const model = gltf.scene;
      model.scale.set(1.5, 1.5, 1.5);
      model.position.y -= 0.9009;
      scene.add(model);
      modelRef.current = model;

      // Apply texture from the react-native-canvas
      // This creates a Three.js texture from the 2D canvas element
      const texture = new THREE.CanvasTexture(canvas2DRef.current);
      textureRef.current = texture;

      model.traverse((child) => {
        if (child.isMesh) {
          // Use MeshStandardMaterial for PBR rendering if the GLB is PBR-ready,
          // otherwise Basic or Lambert. Sticking to map for consistency.
          child.material.map = texture;
          child.material.needsUpdate = true;
        }
      });
    }, undefined, (error) => console.error('Error loading model:', error));


    // Animation loop for Three.js
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      if (isRotatingLogicRef.current && modelRef.current) {
        modelRef.current.rotation.y += 0.01;
      }
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        // Essential for Expo GL to swap buffers and display the rendered frame
        gl.endFrameEXP();
      }
    };
    animate();

    // Cleanup function for useEffect
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (sceneRef.current) {
        sceneRef.current.clear();
      }
      if (textureRef.current) {
        textureRef.current.dispose();
      }
    };
  }, []); // Empty dependency array means this runs once on mount

  // --- React Native Canvas Initialization ---
  const handleCanvas = useCallback(async (canvas) => {
    if (canvas) {
      canvas2DRef.current = canvas;
      // Set the internal dimensions of the 2D canvas for high resolution texture
      canvas.width = 1024;
      canvas.height = 1024;
      // Initial fill of the texture canvas
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      redrawCanvas(); // Initial draw
    }
  }, [redrawCanvas]); // Depends on redrawCanvas


  // --- Event Handling (Touch) ---
  const getCanvasCoordinates = useCallback((nativeEvent) => {
    // Scale touch coordinates from screen coordinates to the 2D texture canvas coordinates
    const { locationX, locationY } = nativeEvent;
    // Map screen width/height to internal 2D canvas texture width/height
    const scaleX = canvas2DRef.current.width / width;
    const scaleY = canvas2DRef.current.height / height;
    return {
      x: locationX * scaleX,
      y: locationY * scaleY
    };
  }, []);

  const handleStart = useCallback((e) => {
    // e.preventDefault() is not used in React Native gestures
    const { x, y } = getCanvasCoordinates(e.nativeEvent);

    lastMouseXRef.current = x;
    lastMouseYRef.current = y;
    startXRef.current = x;
    startYRef.current = y;

    if (currentTool === 'move') {
      const selectedShape = findShapeAt(x, y);
      if (selectedShape) {
        if (selectedShapeRef.current && selectedShapeRef.current !== selectedShape) {
          selectedShapeRef.current.selected = false;
        }
        selectedShape.selected = true;
        dragOffsetXRef.current = x - selectedShape.x;
        dragOffsetYRef.current = y - selectedShape.y;
        isMovingRef.current = true;
        selectedShapeRef.current = selectedShape;
        saveStateForUndo();
      } else {
        if (selectedShapeRef.current) {
          selectedShapeRef.current.selected = false;
          selectedShapeRef.current = null;
        }
        isMovingRef.current = false;
      }
      redrawCanvas();
      return;
    }

    if (selectedShapeRef.current) {
      selectedShapeRef.current.selected = false;
      selectedShapeRef.current = null;
      redrawCanvas();
    }

    saveStateForUndo();
    isDrawingRef.current = true;

    if (currentTool === 'freehand') {
      drawingsRef.current.push({
        type: 'path',
        points: [{ x, y }],
        color: currentColor,
        size: brushSize
      });
    } else if (currentTool === 'text') {
      if (textInput) {
        drawingsRef.current.push({
          type: 'text',
          text: textInput,
          x,
          y,
          color: currentColor,
          size: brushSize * 5,
          selected: false
        });
        redrawCanvas();
      }
      isDrawingRef.current = false;
    }
  }, [currentTool, currentColor, brushSize, textInput, redrawCanvas, saveStateForUndo]);

  const handleMove = useCallback((e) => {
    const { x, y } = getCanvasCoordinates(e.nativeEvent);

    lastMouseXRef.current = x;
    lastMouseYRef.current = y;

    if (isMovingRef.current && selectedShapeRef.current) {
      selectedShapeRef.current.x = x - dragOffsetXRef.current;
      selectedShapeRef.current.y = y - dragOffsetYRef.current;
      redrawCanvas();
      return;
    }

    if (!isDrawingRef.current) return;

    if (currentTool === 'freehand') {
      const path = drawingsRef.current[drawingsRef.current.length - 1];
      if (path) { // Ensure path exists
          path.points.push({ x, y });
      }
    }
    redrawCanvas();
  }, [currentTool, redrawCanvas]);

  const handleEnd = useCallback((e) => {
    if (isMovingRef.current) {
      if (selectedShapeRef.current) {
        selectedShapeRef.current.selected = false;
        selectedShapeRef.current = null;
      }
      isMovingRef.current = false;
      redrawCanvas();
      return;
    }

    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;

    const x = lastMouseXRef.current;
    const y = lastMouseYRef.current;

    if (currentTool === 'rectangle') {
      drawingsRef.current.push({
        type: 'rectangle',
        x: startXRef.current,
        y: startYRef.current,
        width: x - startXRef.current,
        height: y - startYRef.current,
        color: currentColor,
        isHollow,
        selected: false
      });
    } else if (currentTool === 'circle') {
      const radius = Math.sqrt(Math.pow(x - startXRef.current, 2) + Math.pow(y - startYRef.current, 2));
      drawingsRef.current.push({
        type: 'circle',
        x: startXRef.current,
        y: startYRef.current,
        radius,
        color: currentColor,
        isHollow,
        selected: false
      });
    }
    redrawCanvas();
  }, [currentTool, currentColor, isHollow, redrawCanvas]);

  // Handle window resize (using Dimensions API)
  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      if (cameraRef.current && rendererRef.current) {
        cameraRef.current.aspect = window.width / window.height;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(window.width, window.height);
      }
    });
    return () => subscription?.remove();
  }, []);

  // Wheel handling for scaling (needs gesture library for production use in RN, but placeholder provided)
  // There is no direct `onWheel` event in React Native for general components.
  // For actual implementation, consider `react-native-gesture-handler` and `PanGestureHandler`.
  // As per "don't add anything", this will be a conceptual placeholder.
  const handleWheel = useCallback((e) => {
    if (!selectedShapeRef.current || selectedShapeRef.current.type !== 'image') return;

    // e.preventDefault() is not applicable here.
    // Simulating deltaY based on a hypothetical gesture.
    const delta = e.nativeEvent?.velocity?.y || 0; // Placeholder for touch-based "scroll" or pinch

    const scaleFactor = delta > 0 ? 0.9 : 1.1;

    selectedShapeRef.current.width *= scaleFactor;
    selectedShapeRef.current.height *= scaleFactor;

    redrawCanvas();
  }, [redrawCanvas]); // This callback is not directly attached to any component's touch event in this conversion.

  const setActiveTool = useCallback((tool) => {
    setCurrentTool(tool);
    if (selectedShapeRef.current) {
        selectedShapeRef.current.selected = false;
        selectedShapeRef.current = null;
        redrawCanvas();
    }
  }, [redrawCanvas]);

  const findShapeAt = useCallback((x, y) => {
    for (let i = drawingsRef.current.length - 1; i >= 0; i--) {
      const shape = drawingsRef.current[i];

      if (shape.type === 'rectangle') {
        const normalizedX = Math.min(shape.x, shape.x + shape.width);
        const normalizedY = Math.min(shape.y, shape.y + shape.height);
        const normalizedWidth = Math.abs(shape.width);
        const normalizedHeight = Math.abs(shape.height);

        if (x >= normalizedX && x <= normalizedX + normalizedWidth &&
            y >= normalizedY && y <= normalizedY + normalizedHeight) {
          return shape;
        }
      } else if (shape.type === 'circle') {
        const distance = Math.sqrt(Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2));
        if (distance <= shape.radius) {
          return shape;
        }
      } else if (shape.type === 'text') {
        // Approximate text bounds for hit testing in React Native Canvas
        const estimatedWidth = shape.text.length * (shape.size * 0.6); // Simple estimation
        const estimatedHeight = shape.size;
        if (x >= shape.x && x <= shape.x + estimatedWidth &&
            y >= shape.y - estimatedHeight && y <= shape.y) {
          return shape;
        }
      } else if (shape.type === 'image') {
        if (x >= shape.x && x <= shape.x + shape.width &&
            y >= shape.y && y <= shape.y + shape.height) {
          return shape;
        }
      }
    }
    return null;
  }, []);

  const handleImageUpload = useCallback(async () => {
    // In React Native Expo, you'd use 'expo-image-picker' to select an image from the device's gallery.
    // As per "don't add anything new," this is a placeholder.
    Alert.alert(
      "Image Upload",
      "Image upload functionality requires 'expo-image-picker'. Please integrate it manually."
    );
    // Example of how you would integrate (requires 'expo-image-picker' installed):
    /*
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      saveStateForUndo();
      const selectedAsset = result.assets[0];
      const img = new Canvas.Image(canvas2DRef.current);
      img.src = selectedAsset.uri; // Use the URI from expo-image-picker
      img.addEventListener('load', () => {
        const maxDimension = 300;
        const aspectRatio = img.width / img.height;

        let targetWidth = maxDimension;
        let targetHeight = maxDimension;

        if (aspectRatio > 1) {
          targetHeight = maxDimension / aspectRatio;
        } else {
          targetWidth = maxDimension * aspectRatio;
        }

        drawingsRef.current.push({
          type: 'image',
          img: img, // The Canvas.Image object
          imgUri: selectedAsset.uri, // Store URI for serialization/deserialization
          x: canvas2DRef.current.width / 2 - targetWidth / 2,
          y: canvas2DRef.current.height / 2 - targetHeight / 2,
          width: targetWidth,
          height: targetHeight,
          selected: false
        });
        redrawCanvas();
      });
      img.addEventListener('error', (e) => {
          console.error("Failed to load selected image:", e);
          Alert.alert("Error", "Failed to load selected image.");
      });
    }
    */
  }, [saveStateForUndo, redrawCanvas]);

  const handleReset = useCallback(() => {
    saveStateForUndo();
    drawingsRef.current = [];
    redrawCanvas();
  }, [saveStateForUndo, redrawCanvas]);

  // Key down handling (simulated for move/resize in React Native)
  // React Native does not have a global 'keydown' listener like web browsers.
  // For keyboard navigation on physical keyboards, you would typically use
  // a focused component or a library like 'react-native-keyevent'.
  // For on-screen interactions, you'd implement buttons or gestures for move/resize.
  // As per "don't add anything", this will be commented out.
  /*
  const handleKeyDown = useCallback((e) => {
    if (!selectedShapeRef.current) return;

    saveStateForUndo();

    const moveAmount = e.shiftKey ? 10 : 1;
    const selectedShape = selectedShapeRef.current;

    switch (e.key) {
      case 'ArrowUp':
        selectedShape.y -= moveAmount;
        break;
      case 'ArrowDown':
        selectedShape.y += moveAmount;
        break;
      case 'ArrowLeft':
        selectedShape.x -= moveAmount;
        break;
      case 'ArrowRight':
        selectedShape.x += moveAmount;
        break;
      case 'Delete':
      case 'Backspace':
        const index = drawingsRef.current.indexOf(selectedShape);
        if (index !== -1) {
          drawingsRef.current.splice(index, 1);
          selectedShapeRef.current = null;
        }
        break;
      case '+':
      case '=':
        if (selectedShape.type === 'image') {
          selectedShape.width *= 1.1;
          selectedShape.height *= 1.1;
        } else if (selectedShape.type === 'circle') {
          selectedShape.radius *= 1.1;
        } else if (selectedShape.type === 'rectangle') {
          selectedShape.width *= 1.1;
          selectedShape.height *= 1.1;
        } else if (selectedShape.type === 'text') {
          selectedShape.size *= 1.1;
        }
        break;
      case '-':
      case '_':
        if (selectedShape.type === 'image') {
          selectedShape.width *= 0.9;
          selectedShape.height *= 0.9;
        } else if (selectedShape.type === 'circle') {
          selectedShape.radius *= 0.9;
        } else if (selectedShape.type === 'rectangle') {
          selectedShape.width *= 0.9;
          selectedShape.height *= 0.9;
        } else if (selectedShape.type === 'text') {
          selectedShape.size *= 0.9;
        }
        break;
      default:
        return;
    }
    redrawCanvas();
  }, [saveStateForUndo, redrawCanvas]);

  // useEffect(() => {
  //   // document.addEventListener('keydown', handleKeyDown); // Not applicable in RN
  //   // return () => {
  //   //   document.removeEventListener('keydown', handleKeyDown); // Not applicable in RN
  //   // };
  // }, []);
  */

  const sendCanvasSnapshot = useCallback(async () => {
    if (canvas2DRef.current) {
      // Get base64 data from react-native-canvas
      const imageData = await canvas2DRef.current.toDataURL('image/png');
      // In React Native, `window.ReactNativeWebView?.postMessage` is typically used
      // when running *inside* a WebView. If this component is a native Expo app,
      // this needs to be handled differently (e.g., passing as a prop or context value).
      // For a standalone Expo app, you might save it to disk or send to a server.
      console.log('Canvas snapshot sent (first 50 chars):', imageData.substring(0, 50) + '...');
      Alert.alert("Canvas Snapshot", "Canvas data logged to console (first 50 chars).");
    }
  }, []);

  // --- AI Suggestion Logic (Now calling backend) ---
  const handleAISuggestion = useCallback(async () => {
    saveStateForUndo(); // Save current state for undo functionality

    if (!canvas2DRef.current) {
        Alert.alert("Error", "Canvas not ready for AI suggestion.");
        return;
    }

    // Use Alert.prompt for user input in React Native
    const userPrompt = await new Promise(resolve => {
        Alert.prompt(
            "AI Suggestion",
            "What kind of design would you like the AI to suggest? (e.g., 'a vibrant floral pattern', 'a minimalist mountain landscape', 'a futuristic cityscape'):",
            text => resolve(text), // Resolve with the entered text
            'plain-text',
            '', // Default value
            '', // Placeholder for keyboard type (unused here)
        );
    });

    if (!userPrompt) {
        return; // User cancelled the prompt
    }

    setIsLoading(true); // Show loading indicator

    try {
        // Send the request to your backend (e.g., Flask)
        const response = await fetch('http://localhost:5000/api/generate-design', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: userPrompt,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`AI suggestion failed: ${response.status} - ${errorData.error || response.statusText}`);
        }

        const data = await response.json();
        const generatedImageUrl = data.imageUrl; // This should be a base64 data URL or a direct URL

        // Load the generated image onto your react-native-canvas
        const img = new Canvas.Image(canvas2DRef.current);
        img.src = generatedImageUrl;
        img.addEventListener('load', () => {
            const canvas = canvas2DRef.current;

            drawingsRef.current = []; // Clear all existing drawings

            const maxDimension = 500; // Max size for AI generated image on canvas
            const aspectRatio = img.width / img.height;

            let targetWidth = maxDimension;
            let targetHeight = maxDimension;

            if (aspectRatio > 1) {
                targetHeight = maxDimension / aspectRatio;
            } else {
                targetWidth = maxDimension * aspectRatio;
            }

            drawingsRef.current.push({
                type: 'image',
                img: img, // The loaded Canvas.Image object
                imgUri: generatedImageUrl, // Store URI for undo/redo
                x: canvas.width / 2 - targetWidth / 2, // Center the image
                y: canvas.height / 2 - targetHeight / 2,
                width: targetWidth,
                height: targetHeight,
                selected: true, // Select it so user can immediately move/resize
            });
            redrawCanvas(); // Call your function to re-render the canvas
            Alert.alert("AI Suggestion", "New design applied! You can move/resize it with the 'Move' tool.");
        });
        img.addEventListener('error', (e) => {
            console.error("Error loading AI generated image:", e);
            Alert.alert("Error", "Failed to load AI suggested design. Please try again.");
        });

    } catch (error) {
        console.error("Error with AI suggestion:", error);
        Alert.alert("Error", `Sorry, AI suggestion could not be generated: ${error.message}`);
    } finally {
        setIsLoading(false); // Hide loading indicator
    }
  }, [saveStateForUndo, redrawCanvas]);
  // --- End AI Suggestion Logic ---

  const handleScreenshot = useCallback(async () => {
    if (glRef.current) {
        // Expo GLView can take a snapshot directly
        const result = await glRef.current.takeSnapshotAsync({
            format: 'png',
            result: 'file', // 'file' returns a local URI
            quality: 1.0,
        });
        Alert.alert("Screenshot", `Image saved to: ${result.uri}`);
        // You can then use expo-media-library to save it to the camera roll if desired:
        // import * as MediaLibrary from 'expo-media-library';
        // const { status } = await MediaLibrary.requestPermissionsAsync();
        // if (status === 'granted') {
        //   await MediaLibrary.saveToLibraryAsync(result.uri);
        //   Alert.alert("Screenshot", "Screenshot saved to Photos!");
        // }
    } else {
        Alert.alert("Error", "3D Renderer not ready for screenshot.");
    }
  }, []);

  return (
    <View style={styles.container}>
      {/* Three.js Canvas (GLView) */}
      <GLView
        style={styles.glView}
        onContextCreate={onContextCreate}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
        // No onTouchLeave equivalent, handleEnd implicitly covers it
      />

      {/* Hidden react-native-canvas for the 2D texture context */}
      {/* This canvas acts as an offscreen rendering target for the mug's texture */}
      <View style={styles.hiddenCanvasContainer}>
        <Canvas
          ref={handleCanvas}
          style={styles.hiddenCanvas}
        />
      </View>

      {/* Bottom center control bar */}
      <View style={styles.controls}>
        {/* Color Picker (React Native doesn't have a native color input, TextInput for hex code) */}
        <TextInput
          style={styles.textInput}
          value={currentColor}
          onChangeText={setCurrentColor}
          placeholder="e.g., #0000ff"
        />
        {/* Brush Size (React Native doesn't have a native range input, TextInput for number) */}
        <Text style={styles.label}>Brush Size: {brushSize}</Text>
        <TextInput
          style={styles.textInput}
          keyboardType="numeric"
          value={String(brushSize)}
          onChangeText={(text) => setBrushSize(parseInt(text) || 1)}
          placeholder="1-50"
        />
        <Pressable
          onPress={() => setActiveTool('freehand')}
          style={[styles.button, currentTool === 'freehand' && styles.activeButton]}
        >
          <Text style={styles.buttonText}>Freehand</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTool('rectangle')}
          style={[styles.button, currentTool === 'rectangle' && styles.activeButton]}
        >
          <Text style={styles.buttonText}>Rectangle</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTool('circle')}
          style={[styles.button, currentTool === 'circle' && styles.activeButton]}
        >
          <Text style={styles.buttonText}>Circle</Text>
        </Pressable>
        <Pressable
          onPress={() => setIsHollow(!isHollow)}
          style={[styles.button, isHollow && styles.activeButton]}
        >
          <Text style={styles.buttonText}>Hollow</Text>
        </Pressable>
        <Pressable
          onPress={() => setActiveTool('text')}
          style={[styles.button, currentTool === 'text' && styles.activeButton]}
        >
          <Text style={styles.buttonText}>Text</Text>
        </Pressable>
        <TextInput
          style={styles.textInput}
          value={textInput}
          onChangeText={setTextInput}
          placeholder="Enter text"
        />
        <Pressable
          onPress={handleImageUpload} // This will trigger the Alert placeholder
          style={[styles.button, currentTool === 'image' && styles.activeButton]}
        >
          <Text style={styles.buttonText}>Image</Text>
        </Pressable>
        {/* type="file" input is web-specific and removed */}
        <Pressable
          onPress={() => setActiveTool('move')}
          style={[styles.button, currentTool === 'move' && styles.activeButton]}
        >
          <Text style={styles.buttonText}>Move</Text>
        </Pressable>
        <Pressable
          onPress={handleAISuggestion}
          disabled={isLoading}
          style={[styles.button, isLoading && styles.disabledButton]}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Generating...' : 'AI Suggestion'}
          </Text>
          {isLoading && <ActivityIndicator size="small" color="#ffffff" />}
        </Pressable>
        <Pressable
          onPress={() => {
            isRotatingLogicRef.current = !isRotatingLogicRef.current;
            setIsRotating(prev => !prev);
          }}
          style={[styles.button, isRotating && styles.activeButton]}
        >
          <Text style={styles.buttonText}>Preview</Text>
        </Pressable>
        <Pressable
          onPress={handleReset}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Reset</Text>
        </Pressable>
        <Pressable
          onPress={sendCanvasSnapshot}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Send to App</Text>
        </Pressable>
        <Pressable onPress={handleScreenshot} style={styles.button}>
          <Text style={styles.buttonText}>Screenshot</Text>
        </Pressable>
      </View>

      {/* Left-side controls */}
      <View style={styles.controlsLeft}>
        <Pressable onPress={handleUndo} disabled={undoStack.length === 0} style={[styles.button, undoStack.length === 0 && styles.disabledButton]}>
          <Text style={styles.buttonText}>Undo</Text>
        </Pressable>
        <Pressable onPress={handleRedo} disabled={redoStack.length === 0} style={[styles.button, redoStack.length === 0 && styles.disabledButton]}>
          <Text style={styles.buttonText}>Redo</Text>
        </Pressable>
      </View>

      {/* Tooltip (web-specific, removed from RN) */}
    </View>
  );
}

// React Native StyleSheet for styling components
const styles = StyleSheet.create({
  container: {
    flex: 1, // Take full height and width
    backgroundColor: 'rgb(161, 161, 161)',
    alignItems: 'center', // Center content horizontally
    justifyContent: 'center', // Center content vertically
  },
  glView: {
    width: '100%',
    height: '100%',
    // Position absolute to overlay other content if needed, but flex:1 usually works for main canvas
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hiddenCanvasContainer: {
    position: 'absolute',
    // Hide the actual react-native-canvas from display
    // It's used as an off-screen canvas for the Three.js texture
    width: 1, // Make it very small
    height: 1,
    opacity: 0, // Make it completely transparent
    overflow: 'hidden', // Hide any overflow
    zIndex: -1, // Ensure it's behind other elements
  },
  hiddenCanvas: {
    width: 1024, // Internal resolution for the texture
    height: 1024,
  },
  controls: {
    position: 'absolute',
    bottom: 10,
    // Using percentages for horizontal positioning for responsiveness
    left: '3%',
    width: '94%', // (100 - 3 - 3) = 94%
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row', // Arrange items in a row
    flexWrap: 'wrap', // Allow items to wrap to next line
    justifyContent: 'center', // Center items horizontally
    alignItems: 'center', // Center items vertically within each line
    // For spacing between items in a row (mimics gap)
    marginVertical: -5, // Negative margin to offset positive item margins
    marginHorizontal: -5,
  },
  controlsLeft: {
    position: 'absolute',
    top: '50%', // Vertically center
    right: 20, // 20px from the right edge
    transform: [{ translateY: -50 }], // Adjust for its own height to truly center
    backgroundColor: 'rgba(30, 30, 30, 0.95)',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'column', // Arrange items in a column
    // For spacing between items in a column
    marginVertical: -5,
    marginHorizontal: -5,
  },
  textInput: {
    padding: 8,
    borderRadius: 6,
    fontSize: 14,
    backgroundColor: '#2c2c2c',
    color: 'white',
    width: 140, // Fixed width
    textAlign: 'center',
    margin: 5, // Spacing between inputs and buttons
  },
  label: {
    color: 'white',
    fontSize: 14,
    margin: 5,
  },
  button: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e60159', // Default button color
    minWidth: 100,
    maxWidth: 160,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 5, // Spacing between buttons
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeButton: {
    backgroundColor: 'rgb(207, 52, 112)', // Active state color
    // React Native uses specific shadow properties for iOS and elevation for Android
    shadowColor: 'rgb(207, 52, 112)', // iOS shadow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5, // Android shadow
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: '#555',
  },
  // Tooltip styles are removed as they are web-specific
});
