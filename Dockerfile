# Official Playwright image ships Node + all browsers + OS deps preinstalled,
# which keeps the Jenkins pipeline fast and avoids flaky browser-download steps.
FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Default env can be overridden at `docker run` time with:
#   docker run -e TEST_ENV=staging fashionhub-qa
# or by passing --env=<name> through DOCKER_ARGS / the Jenkinsfile.
ENV TEST_ENV=production

CMD ["npx", "playwright", "test"]
