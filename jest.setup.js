// Native modules are not available under Jest: use AsyncStorage's official mock and a tiny Firebase stand-in.
jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@react-native-firebase/auth", () => ({}), { virtual: false });
jest.mock("@react-native-firebase/firestore", () => ({}), { virtual: false });
jest.mock("./game/cloud", () => ({ cloudAvailable: false, saveProfile: jest.fn() }));
