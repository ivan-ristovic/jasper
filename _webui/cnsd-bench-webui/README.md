# JASPER Web UI

Local dashboard for launching curated JASPER shell-script workflows.
The dashboard is optional convenience tooling; the benchmark scripts remain the reproducibility interface.

## Run

```sh
npm install
npm start
```

Open `http://127.0.0.1:5177`.
Set `JASPER_WEBUI_PORT=<port>` to use another port.

## Behavior

- The server binds to `127.0.0.1` by default.
- Only actions from the server-side allowlist can run.
- Arguments are typed and validated; arbitrary shell commands and raw argument strings are not accepted.
- Jobs run one at a time through a FIFO queue.
- Logs and job metadata are stored in `runs/`, which is ignored by git.
- Canceling a job terminates the job process group.
- The status strip reports per-action dependencies such as `GRAALVM_HOME`, `java`, `native-image`, `mvn`, `gcc`, `curl`, `hyperfine`, and `datamash`.

## Screenshots

The paper screenshots are generated from deterministic demo state:

```sh
npm run screenshots
```

This writes `webui-dashboard.png` and `webui-logs.png` to the repository `paper/` directory.
