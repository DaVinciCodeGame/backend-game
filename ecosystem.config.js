module.exports = {
  apps: [
    {
      script: 'socket.js',
      instances: 'max',
      exec_mode: 'cluster',
    },
  ],
};
