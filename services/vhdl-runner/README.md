# CampusConnect VHDL runner

The runner uses the official `ghdl/ghdl:7.0.0-dev-mcode-ubuntu-24.04` image published by the
GHDL Docker project. It only listens on `127.0.0.1:2001`, receives one source
file at `POST /execute`, and requires a VHDL-2008 testbench entity named `tb`.

Start it locally:

```sh
docker compose -f services/vhdl-runner/compose.yaml up --build -d
curl http://127.0.0.1:2001/healthz
```

Stop it:

```sh
docker compose -f services/vhdl-runner/compose.yaml down
```

The GHDL runner is isolated on an internal Docker network. A small unprivileged
gateway is the only container with a host port, and that port is bound only to
localhost. Both containers use read-only root filesystems, tmpfs work areas,
no Linux capabilities, no-new-privileges, and CPU/memory/PID limits. There is
no Docker socket, host-project mount, or secret in either container.

For local CampusConnect development, `VHDL_API_URL` defaults to
`http://127.0.0.1:2001`. A hosted deployment needs a separately operated,
network-restricted runner with equivalent or stronger isolation.
