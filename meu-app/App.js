import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./src/navigation/StackNavigator";
import { AppRegistry, Platform } from "react-native";
import { AuthProvider } from "./src/contexts/AuthContext"; // 👈 importe o AuthProvider

// Configuração para web
const linking = {
  prefixes: [],
  config: {
    screens: {
      Login: "login",
      Register: "register",
    },
  },
};

export default function App() {
  return (
    <AuthProvider> {/* 👈 envolva toda a navegação com o AuthProvider */}
      <NavigationContainer linking={Platform.OS === "web" ? linking : undefined}>
        <StackNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

// Registro para mobile
AppRegistry.registerComponent("main", () => App);

// Registro para web
if (typeof document !== "undefined") {
  const rootTag =
    document.getElementById("root") || document.getElementById("main");
  AppRegistry.runApplication("main", { rootTag });
}
