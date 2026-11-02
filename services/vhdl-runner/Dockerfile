FROM ghdl/ghdl:7.0.0-dev-mcode-ubuntu-24.04

USER root
RUN apt-get update \
  && apt-get install --no-install-recommends --yes python3 \
  && rm -rf /var/lib/apt/lists/* \
  && useradd --uid 10001 --create-home --shell /usr/sbin/nologin vhdlrunner

WORKDIR /srv/vhdl-runner
COPY server.py /srv/vhdl-runner/server.py
USER 10001:10001

EXPOSE 2001
CMD ["python3", "/srv/vhdl-runner/server.py"]
