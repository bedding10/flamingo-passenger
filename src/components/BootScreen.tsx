import React, { useEffect, useRef } from "react";
import { Animated, Image, View } from "react-native";
export function BootScreen() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [v]);
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#fff",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          opacity: v,
          transform: [
            {
              scale: v.interpolate({
                inputRange: [0, 1],
                outputRange: [0.92, 1],
              }),
            },
          ],
        }}
      >
        <Image
          source={require("../../assets/brand-master-logo.png")}
          resizeMode="contain"
          style={{ width: 240, height: 292 }}
        />
      </Animated.View>
    </View>
  );
}
