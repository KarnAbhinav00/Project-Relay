function log(level, event, details = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...details,
  };
  const line = JSON.stringify(payload);

  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

function info(event, details) {
  log("info", event, details);
}

function warn(event, details) {
  log("warn", event, details);
}

function error(event, details) {
  log("error", event, details);
}

module.exports = { info, warn, error };
