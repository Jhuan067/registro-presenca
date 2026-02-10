import { useCallback, useEffect, useRef, useState } from "react";
import {
  Image,
  Keyboard,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as Location from "expo-location";
import { useRouter } from "expo-router";

const BACKEND_URL = "http://192.168.2.105:3333";

export default function Presenca() {
  const cameraRef = useRef<CameraView | null>(null);
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [foto, setFoto] = useState<string | null>(null);
  const [justificar, setJustificar] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [cameraTipo, setCameraTipo] = useState<CameraType>("front");
  const [tipoRegistro, setTipoRegistro] = useState<"entrada" | "saida">(
    "entrada",
  );
  const [carregando, setCarregando] = useState(true);
  const [localizacao, setLocalizacao] = useState<any>(null);
  const [endereco, setEndereco] = useState<string | null>(null);

  function hoje() {
    return new Date().toISOString().split("T")[0];
  }

  const verificarRegistro = useCallback(async () => {
    try {
      const usuarioStr = await AsyncStorage.getItem("usuario");
      if (!usuarioStr) {
        setTipoRegistro("entrada");
        return;
      }

      const usuario = JSON.parse(usuarioStr);

      const response = await fetch(
        `${BACKEND_URL}/presenca/${usuario.id}?date=${hoje()}`,
      );

      const dados = await response.json();

      const entradaExiste = dados.some((r: any) => r.tipo === "entrada");
      const saidaExiste = dados.some((r: any) => r.tipo === "saida");

      if (!entradaExiste) setTipoRegistro("entrada");
      else if (!saidaExiste) setTipoRegistro("saida");
      else setTipoRegistro("entrada"); // apenas visual
    } catch (err) {
      console.error(err);
      setTipoRegistro("entrada");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    requestPermission();
    verificarRegistro();
    Location.requestForegroundPermissionsAsync();
  }, [requestPermission, verificarRegistro]);

  async function converterEndereco(latitude: number, longitude: number) {
    try {
      const resposta = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });
      if (!resposta.length) return null;

      const lugar = resposta[0];
      return `${lugar.street || ""} ${lugar.name || ""} - ${
        lugar.subregion || lugar.district || ""
      }, ${lugar.city || ""} - ${lugar.region || ""}`;
    } catch {
      return null;
    }
  }

  async function registrarPresenca() {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.5,
      mirror: false,
    });

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const enderecoConvertido = await converterEndereco(
      location.coords.latitude,
      location.coords.longitude,
    );

    setFoto(photo.uri);
    setLocalizacao(location.coords);
    setEndereco(enderecoConvertido);
  }

  async function enviar() {
    try {
      const usuarioStr = await AsyncStorage.getItem("usuario");
      if (!usuarioStr) throw new Error("Usuário não encontrado");

      const usuario = JSON.parse(usuarioStr);

      const payload = {
        funcionario_id: usuario.id,
        foto_url: foto,
        localizacao,
        endereco,
        justificativa: justificar ? motivo : null,
      };

      const response = await fetch(`${BACKEND_URL}/presenca`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Erro ao registrar presença");
        return;
      }

      alert(
        `Registro de ${data.presenca.tipo.toUpperCase()} realizado com sucesso`,
      );

      setFoto(null);
      setJustificar(false);
      setMotivo("");
      setLocalizacao(null);
      setEndereco(null);

      router.replace("/login");
    } catch (err) {
      console.error(err);
      alert("Erro ao registrar presença");
    }
  }

  function trocarCamera() {
    setCameraTipo((prev) => (prev === "front" ? "back" : "front"));
  }

  if (!permission) return <View />;
  if (!permission.granted) return <Text>Permissão da câmera negada</Text>;
  if (carregando) return <View />;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.title}>Registro de Presença</Text>

        {!foto ? (
          <>
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing={cameraTipo}
            />

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.button}
                onPress={registrarPresenca}
              >
                <Text style={styles.buttonText}>
                  Registrar {tipoRegistro === "entrada" ? "Entrada" : "Saída"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchButton}
                onPress={trocarCamera}
              >
                <Text style={styles.switchText}>Virar câmera</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Image source={{ uri: foto }} style={styles.preview} />
        )}

        <View style={styles.justificativa}>
          <Text>Justificar atraso</Text>
          <Switch value={justificar} onValueChange={setJustificar} />
        </View>

        {justificar && (
          <TextInput
            style={styles.textArea}
            placeholder="Informe o motivo"
            value={motivo}
            onChangeText={setMotivo}
            multiline
          />
        )}

        {foto && (
          <TouchableOpacity style={styles.buttonEnviar} onPress={enviar}>
            <Text style={styles.buttonText}>Enviar</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#fff" },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },
  camera: { width: "100%", height: 300, borderRadius: 8, overflow: "hidden" },
  preview: { width: "100%", height: 300, borderRadius: 8, marginTop: 12 },
  row: { flexDirection: "row", gap: 12, marginTop: 16 },
  button: {
    flex: 1,
    height: 48,
    backgroundColor: "#1e40af",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
  },
  switchButton: {
    height: 48,
    paddingHorizontal: 16,
    backgroundColor: "#475569",
    borderRadius: 6,
    justifyContent: "center",
  },
  switchText: { color: "#fff", fontWeight: "bold" },
  buttonEnviar: {
    height: 48,
    backgroundColor: "#16a34a",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  buttonText: { color: "#fff", fontWeight: "bold" },
  justificativa: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textArea: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
    minHeight: 80,
  },
});
