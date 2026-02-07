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

export default function Presenca() {
  const cameraRef = useRef<CameraView | null>(null);

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

  /**
   * Verifica se já existe registro hoje
   */
  const verificarRegistro = useCallback(async () => {
    const registro = await AsyncStorage.getItem("registro_hoje");

    if (!registro) {
      setTipoRegistro("entrada");
    } else {
      const dados = JSON.parse(registro);

      if (dados.data === hoje() && dados.tipo === "entrada") {
        setTipoRegistro("saida");
      } else {
        setTipoRegistro("entrada");
      }
    }

    setCarregando(false);
  }, []);

  useEffect(() => {
    requestPermission();
    verificarRegistro();
    Location.requestForegroundPermissionsAsync();
  }, [requestPermission, verificarRegistro]);

  /**
   * Converte latitude/longitude em endereço aproximado
   */
  async function converterEndereco(latitude: number, longitude: number) {
    try {
      const resposta = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      if (resposta.length === 0) return null;

      const lugar = resposta[0];

      return `${lugar.street || ""} ${lugar.name || ""} - ${
        lugar.subregion || lugar.district || ""
      }, ${lugar.city || ""} - ${lugar.region || ""}`;
    } catch {
      return null;
    }
  }

  /**
   * Tirar foto + pegar localização
   */
  async function registrarPresenca() {
    if (!cameraRef.current) return;

    const photo = await cameraRef.current.takePictureAsync({
      quality: 0.5,
      mirror: false, // não inverte eixo
    });

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const enderecoConvertido = await converterEndereco(
      location.coords.latitude,
      location.coords.longitude,
    );

    setFoto(photo.uri);
    setLocalizacao({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    });
    setEndereco(enderecoConvertido);
  }

  /**
   * Salvar registro
   */
  async function enviar() {
    await AsyncStorage.setItem(
      "registro_hoje",
      JSON.stringify({
        tipo: tipoRegistro,
        data: hoje(),
        horario: new Date().toLocaleTimeString(),
        justificativa: justificar ? motivo : null,
        localizacao,
        endereco,
      }),
    );

    alert(`Registro de ${tipoRegistro.toUpperCase()} realizado com sucesso`);
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
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
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
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 16,
  },

  camera: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    overflow: "hidden",
  },

  preview: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    marginTop: 12,
  },

  row: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },

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

  switchText: {
    color: "#fff",
    fontWeight: "bold",
  },

  buttonEnviar: {
    height: 48,
    backgroundColor: "#16a34a",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },

  buttonText: {
    color: "#fff",
    fontWeight: "bold",
  },

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
    textAlignVertical: "top",
  },
});
