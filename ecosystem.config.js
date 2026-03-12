module.exports = {
  apps: [
    {
      name: "NuclearWarServer",
      script: "./server.js",
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "BrainModuleTelemetry",
      script: "./BRAIN_MODULE/DashboardServer.js",
      watch: ["./BRAIN_MODULE"],
      ignore_watch: ["node_modules"],
      env: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "server_errors.log",
      out_file: "server_output.log"
    }
  ]
};
