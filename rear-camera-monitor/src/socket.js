import io from "socket.io-client";

const socket = io("http://10.23.213.8:5000");

export default socket;