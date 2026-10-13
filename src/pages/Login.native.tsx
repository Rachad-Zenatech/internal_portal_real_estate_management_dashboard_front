import { useState, useEffect } from "react";
import { Alert, View, Text, StyleSheet, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  NativeCard,
  NativeCardHeader,
  NativeCardTitle,
  NativeCardDescription,
  NativeCardContent,
  NativeCardFooter,
  NativeButton,
} from "@/components/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { getApiBaseUrl } from "@/lib/env";
import { useAuth } from "@/lib/AuthContext";
import { appStorage } from "@/lib/storage";

WebBrowser.maybeCompleteAuthSession();

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { refreshPermissions } = useAuth();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const match = event.url.match(/[?&]token=([^&]+)/);
      if (match && match[1]) {
        const token = decodeURIComponent(match[1]);
        appStorage.setItem("token", token);
        await refreshPermissions();
        if (Platform.OS === "ios") {
          try {
            WebBrowser.dismissAuthSession();
          } catch {
            // Ignore dismiss session errors on iOS
          }
        }
      }
    };

    const sub = Linking.addEventListener("url", handleDeepLink);
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => {
      sub.remove();
    };
  }, [refreshPermissions]);

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const ssoUrl = `${baseUrl}/api/auth/microsoft/login`;
      const redirectUrl = Linking.createURL("login");

      const result = await WebBrowser.openAuthSessionAsync(
        ssoUrl,
        redirectUrl
      );

      if (result.type === "success" && result.url) {
        const match = result.url.match(/[?&]token=([^&]+)/);
        if (match && match[1]) {
          const token = decodeURIComponent(match[1]);
          appStorage.setItem("token", token);
          await refreshPermissions();
        }
      }
    } catch (err: unknown) {
      Alert.alert(
        "Sign In Error",
        (err as Error)?.message || "Failed to complete sign in"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDirectLogin = async () => {
    setIsLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      let res = await fetch(`${baseUrl}/api/auth/developer/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "alvin.tsang@zenatech.com" }),
      });
      let data = await res.json();
      if (!data.token) {
        res = await fetch(`${baseUrl}/api/auth/developer/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: "rachad.quintyne@zenatech.com" }),
        });
        data = await res.json();
      }

      if (data.token) {
        appStorage.setItem("token", data.token);
        await refreshPermissions();
      } else {
        throw new Error(data.detail || "Direct login failed");
      }
    } catch (err: unknown) {
      Alert.alert(
        "Direct Login Error",
        (err as Error)?.message || "Could not log in with developer profile"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.cardWrapper}>
        <View style={styles.iconContainer}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="layers-outline" size={32} color="#2563eb" />
          </View>
        </View>

        <NativeCard style={styles.card}>
          <NativeCardHeader style={styles.header}>
            <NativeCardTitle style={styles.title}>Template</NativeCardTitle>
            <NativeCardDescription style={styles.description}>
              Enterprise Portal Single Sign-On
            </NativeCardDescription>
          </NativeCardHeader>

          <NativeCardContent style={styles.content}>
            <Text style={styles.instructions}>
              Sign in with your organization account to access corporate resources, approvals, and administrative services.
            </Text>
          </NativeCardContent>

          <NativeCardFooter style={styles.footer}>
            <NativeButton
              title="Sign in with Microsoft"
              variant="default"
              size="lg"
              isLoading={isLoading}
              leftIcon={<MaterialCommunityIcons name="microsoft" size={20} color="#ffffff" />}
              style={styles.signInButton}
              onPress={handleLogin}
            />

            <View style={styles.devSection}>
              <NativeButton
                title="Direct Dev Login"
                variant="outline"
                size="sm"
                isLoading={isLoading}
                style={styles.devButton}
                onPress={handleDirectLogin}
              />
            </View>
          </NativeCardFooter>
        </NativeCard>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 420,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  iconBox: {
    width: 64,
    height: 64,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
  },
  header: {
    alignItems: "center",
    paddingTop: 28,
    paddingBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: -0.4,
    textAlign: "center",
  },
  description: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
  content: {
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  instructions: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  signInButton: {
    width: "100%",
    borderRadius: 12,
  },
  devSection: {
    marginTop: 12,
    alignItems: "center",
  },
  devButton: {
    width: "100%",
    borderRadius: 10,
  },
});
