import { router } from "expo-router";
import { useState } from "react";
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

const BACKEND_URL = "http://192.168.2.105:3333"; // ⚠️ Use o IP da sua máquina

export default function LoginScreen() {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function handleConfirmar() {
    if (!matricula) {
      alert("Informe sua matrícula");
      return;
    }

    if (!senha) {
      alert("Informe a senha");
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matricula, senha }), // ✅ enviar matricula, não nome
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro no login");
        return;
      }

      // Salvar dados do funcionário localmente
      await AsyncStorage.setItem("usuario", JSON.stringify(data.funcionario));

      router.push("/presenca");
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar com o servidor");
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require("../assets/images/unnamed.jpg")}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.form}>
            <Text style={styles.title}>Registro de Presença</Text>

            <Text style={styles.label}>Matrícula do funcionário</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 10234"
              value={matricula}
              onChangeText={setMatricula}
              keyboardType="numeric"
              onBlur={() => matricula && setMostrarSenha(true)}
            />

            {mostrarSenha && (
              <>
                <Text style={styles.label}>Senha</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Senha de acesso"
                  secureTextEntry
                  value={senha}
                  onChangeText={setSenha}
                />
              </>
            )}

            <TouchableOpacity style={styles.button} onPress={handleConfirmar}>
              <Text style={styles.buttonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logo: { width: 240, height: 240, alignSelf: "center", marginBottom: 24 },
  form: { flex: 1 },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 32,
    color: "#0f172a",
  },
  label: { marginBottom: 6, fontSize: 14, color: "#334155" },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  button: {
    height: 48,
    backgroundColor: "#1e40af",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
