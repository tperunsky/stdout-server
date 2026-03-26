FROM oven/bun:1

WORKDIR /app

COPY package.json tsconfig.json ./
COPY src ./src
COPY bin ./bin

ENV PORT=10661

EXPOSE 10661

CMD ["bun", "src/main.ts"]
