const express = require('express');
const http = require('http');
const net = require('net');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// Middleware to handle HTTP and HTTPS requests
app.use(createProxyMiddleware({
    target: 'http://example.com', // Default target; will be overridden dynamically
    changeOrigin: true,
    secure: false,
    logLevel: 'silent', // Set to 'debug' for detailed logs
    router: (req) => {
      // Determine the protocol and host dynamically
      const protocol = req.socket.encrypted ? 'https' : 'http';
      return `${protocol}://${req.headers.host}`;
    },
    onProxyReq: (proxyReq, req, res) => {
      // Optional: Modify the proxy request here if needed
    },
    onProxyRes: (proxyRes, req, res) => {
      // Optional: Modify the proxy response here if needed
    },
    onError: (err, req, res) => {
      console.error('Proxy error:', err);
      res.status(500).send('Proxy error');
    },
  })
);

// Create an HTTP server
const server = http.createServer(app);

// Handle HTTPS connections via the CONNECT method
server.on('connect', (req, clientSocket, head) => {
  const serverUrl = req.url; // e.g., 'example.com:443'
  const [host, port] = serverUrl.split(':');

  // Establish a connection to the target server
  const serverSocket = net.connect(port || 443, host, () => {
    // Inform the client that the connection has been established
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n');

    // Pipe the sockets together for bi-directional communication
    serverSocket.write(head);

    // Handle data transmission between client and server
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  // Handle errors on the server socket
  serverSocket.on('error', (err) => {
    console.error('Server socket error:', err);
    clientSocket.end();
  });

  // Handle errors on the client socket
  clientSocket.on('error', (err) => {
    console.error('Client socket error:', err);
    serverSocket.end();
  });
});

// Start the proxy server
server.listen(3000, () => {
  console.log('Proxy server is running on port 3000');
});