export function payableClockIn(actualDate, clinicName) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23"
  }).formatToParts(actualDate);
  const hour = Number(parts.find(part => part.type === "hour")?.value || 0);
  const minute = Number(parts.find(part => part.type === "minute")?.value || 0);
  const actualMinutes = hour * 60 + minute;
  const normalizedClinic = String(clinicName || "").trim().toLocaleLowerCase("en-US").normalize("NFD").replace(/\p{Diacritic}/gu, "");
  const minimumMinutes = normalizedClinic.includes("sagrado corazon") ? 8 * 60 + 25 : 8 * 60 + 55;
  if (actualMinutes >= minimumMinutes) return actualDate.toISOString();
  return new Date(actualDate.getTime() + (minimumMinutes - actualMinutes) * 60000 - actualDate.getSeconds() * 1000 - actualDate.getMilliseconds()).toISOString();
}
