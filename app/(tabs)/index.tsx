import { View, Text, TextInput, Button } from "react-native";
import { useState } from "react";

export default function HomeScreen() {
  const [name, setName] = useState("");
  const [ip, setIp] = useState("");

  return (
    <View style={{ flex: 1, justifyContent: "center", padding: 20 }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>
        IPL Auction - Join
      </Text>

      <TextInput
        placeholder="Enter Name"
        value={name}
        onChangeText={setName}
        style={{ borderWidth: 1, marginBottom: 10, padding: 10 }}
      />

      <TextInput
        placeholder="Enter Server IP"
        value={ip}
        onChangeText={setIp}
        style={{ borderWidth: 1, marginBottom: 20, padding: 10 }}
      />

      <Button
        title="Join Auction"
        onPress={() => {
          console.log(name, ip);
        }}
      />
    </View>
  );
}
