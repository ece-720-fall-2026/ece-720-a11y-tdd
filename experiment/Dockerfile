# One fresh container per agent session. Only the run's workspace is mounted at /work.
FROM mcr.microsoft.com/playwright:v1.63.0-noble

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl git ca-certificates \
  && rm -rf /var/lib/apt/lists/* \
  && npm install -g pnpm@11.5.2

USER pwuser
RUN curl -fsS https://cursor.com/install | bash
ENV PATH=/home/pwuser/.local/bin:$PATH
RUN git config --global user.name "agent" \
  && git config --global user.email "agent@example.com" \
  && git config --global --add safe.directory /work

WORKDIR /work
