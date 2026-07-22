import React, { useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { GLView } from "expo-gl";
import type { ExpoWebGLRenderingContext } from "expo-gl";
import { Renderer, loadAsync } from "expo-three";
import * as THREE from "three";
import { managedAsset } from "../core/assets";

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    mesh.geometry?.dispose();
    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];
    for (const material of materials) {
      for (const value of Object.values(material))
        if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}
export function BrandModel() {
  const entrance = useRef(new Animated.Value(0)).current;
  const alive = useRef(true);
  const cleanup = useRef<(() => void) | null>(null);
  useEffect(() => {
    alive.current = true;
    Animated.spring(entrance, {
      toValue: 1,
      useNativeDriver: true,
      damping: 15,
      stiffness: 90,
    }).start();
    return () => {
      alive.current = false;
      cleanup.current?.();
      cleanup.current = null;
    };
  }, [entrance]);
  const onContext = async (gl: ExpoWebGLRenderingContext) => {
    cleanup.current?.();
    const renderer = new Renderer({ gl });
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0xffffff, 0);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      38,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, 4.2);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x666666, 2.4));
    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(3, 4, 5);
    scene.add(light);
    const asset = managedAsset("brand.logo.3d");
    if (!asset) {
      renderer.dispose();
      return;
    }
    const loaded = (await loadAsync(asset.localUri)) as
      THREE.Object3D | { scene?: THREE.Object3D };
    const object = loaded instanceof THREE.Object3D ? loaded : loaded.scene;
    if (!object) {
      renderer.dispose();
      return;
    }
    const box = new THREE.Box3().setFromObject(object),
      size = box.getSize(new THREE.Vector3()),
      center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    object.scale.setScalar(2.4 / Math.max(size.x, size.y, size.z));
    scene.add(object);
    const clock = new THREE.Clock();
    let frame = 0;
    const stop = () => {
      if (frame) cancelAnimationFrame(frame);
      disposeObject(object);
      renderer.dispose();
    };
    cleanup.current = stop;
    const draw = () => {
      if (!alive.current) return;
      object.rotation.y += clock.getDelta() * 0.32;
      renderer.render(scene, camera);
      gl.endFrameEXP();
      frame = requestAnimationFrame(draw);
    };
    draw();
  };
  return (
    <Animated.View
      style={{
        flex: 1,
        opacity: entrance,
        transform: [
          {
            scale: entrance.interpolate({
              inputRange: [0, 1],
              outputRange: [0.78, 1],
            }),
          },
        ],
      }}
    >
      <View style={{ flex: 1 }}>
        <GLView style={{ flex: 1 }} onContextCreate={onContext} />
      </View>
    </Animated.View>
  );
}
