import { useState, useEffect } from "react";

export const useWebSocket = (url) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ws = new WebSocket(url);

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onclose = () => {
      setIsConnected(false);
      // Try to reconnect after 2 seconds
      setTimeout(() => {
        setSocket(new WebSocket(url));
      }, 2000);
    };

    ws.onerror = (event) => {
      setError("WebSocket error occurred");
      console.error("WebSocket error:", event);
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, [url]);

  const sendMessage = (message) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    }
  };

  return { socket, isConnected, error, sendMessage };
};
