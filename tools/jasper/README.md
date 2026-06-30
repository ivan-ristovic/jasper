# JASPER Control Service

CLI, queue service, and WebUI for launching curated JASPER benchmark workflows.

## Run

```sh
npm install
npm start
```

Open `http://127.0.0.1:5177`.
Set `JASPER_PORT=<port>` or run `../../jasper serve --port <port>` to use another port.
For remote machines, run `jasper serve` remotely and connect through SSH port forwarding.

## Behavior

- The server binds to `127.0.0.1`.
- Only actions from the server-side allowlist can run.
- Arguments are typed and validated; arbitrary shell commands and raw argument strings are not accepted.
- Jobs run one at a time through a FIFO queue.
- Logs and job metadata are stored in root `.jasper/runs/`, which is ignored by git.
- Canceling a job terminates the job process group.
- Java jobs use the configured GraalVM home for both `JAVA_HOME` and `GRAALVM_HOME`.
- The status strip reports per-action dependencies such as the Java runtime, `native-image`, `mvn`, `gcc`, `curl`, `hyperfine`, and `datamash`.

## Screenshots

The paper screenshots are generated from deterministic demo state:

```sh
npm run screenshots
```

This writes `webui-dashboard.png` and `webui-logs.png` to the repository `paper/` directory.
