const sensors = {
  temperature: { name: 'Temperature', icon: '🌡️', unit: '°C', value: 31 },
  humidity: { name: 'Humidity', icon: '💧', unit: '%', value: 62 },
  gas: { name: 'Gas / Smoke Level', icon: '🫧', unit: 'ppm', value: 180 },
  air: { name: 'Air Quality', icon: '🌫️', unit: 'AQI', value: 70 },
  water: { name: 'Water Level', icon: '🌊', unit: 'cm', value: 40 },
  rain: { name: 'Rainfall Status', icon: '🌧️', unit: '', value: 'Dry' },
  flame: { name: 'Fire / Flame', icon: '🔥', unit: '', value: 'Not Detected' },
  soil: { name: 'Soil Moisture', icon: '🌱', unit: '%', value: 45 },
  vibration: {
    name: 'Sound / Vibration',
    icon: '📳',
    unit: '',
    value: 'Not Detected',
  },
  battery: { name: 'Battery / Power', icon: '🔋', unit: '%', value: 92 },
}

const history = { temperature: [], humidity: [], water: [] }
let scenarioStep = 0
let scenarioOn = false
const lastStatus = {}

function rand(min, max) {
  return Math.random() * (max - min) + min
}
function drift(value, amount, min, max) {
  const next = value + rand(-amount, amount)
  return Math.min(max, Math.max(min, next))
}
function clockString() {
  return new Date().toLocaleTimeString('en-IN', { hour12: false })
}

function sensorStatus(key, v) {
  switch (key) {
    case 'temperature':
      return v >= 48 ? 'danger' : v >= 40 ? 'warning' : 'safe'
    case 'humidity':
      return v >= 92 || v <= 18 ? 'warning' : 'safe'
    case 'gas':
      return v >= 600 ? 'danger' : v >= 350 ? 'warning' : 'safe'
    case 'air':
      return v >= 200 ? 'danger' : v >= 120 ? 'warning' : 'safe'
    case 'water':
      return v >= 120 ? 'danger' : v >= 80 ? 'warning' : 'safe'
    case 'soil':
      return v >= 90 ? 'danger' : v >= 75 ? 'warning' : 'safe'
    case 'battery':
      return v <= 15 ? 'danger' : v <= 30 ? 'warning' : 'safe'
    case 'rain':
      return v === 'Heavy' ? 'danger' : v === 'Wet' ? 'warning' : 'safe'
    case 'flame':
      return v === 'Detected' ? 'danger' : 'safe'
    case 'vibration':
      return v === 'Detected' ? 'warning' : 'safe'
    default:
      return 'safe'
  }
}

function updateSensorValues() {
  const s = sensors

  if (!scenarioOn) {
    s.temperature.value = drift(s.temperature.value, 0.6, 27, 36)
    s.humidity.value = drift(s.humidity.value, 1.5, 48, 78)
    s.gas.value = drift(s.gas.value, 15, 120, 260)
    s.air.value = drift(s.air.value, 6, 45, 100)
    s.water.value = drift(s.water.value, 1.2, 30, 55)
    s.soil.value = drift(s.soil.value, 1.2, 35, 58)
    s.rain.value = Math.random() < 0.12 ? 'Wet' : 'Dry'
    s.flame.value = 'Not Detected'
    s.vibration.value = Math.random() < 0.07 ? 'Detected' : 'Not Detected'
    s.battery.value = Math.min(100, s.battery.value + rand(-0.1, 0.25))
  } else {
    scenarioStep++
    const k = scenarioStep

    s.temperature.value = Math.min(58, 32 + k * 2.0 + rand(-0.5, 0.5))
    s.humidity.value = Math.min(97, 62 + k * 2.4 + rand(-1, 1))
    s.gas.value = Math.min(900, 200 + k * 55 + rand(-15, 15))
    s.air.value = Math.min(320, 80 + k * 18 + rand(-5, 5))
    s.water.value = Math.min(160, 45 + k * 8 + rand(-1, 1))
    s.soil.value = Math.min(99, 50 + k * 4 + rand(-1, 1))
    s.rain.value = k >= 6 ? 'Heavy' : k >= 2 ? 'Wet' : 'Dry'
    s.flame.value = k >= 7 ? 'Detected' : 'Not Detected'
    s.vibration.value = k >= 5 ? 'Detected' : 'Not Detected'
    s.battery.value = Math.max(6, s.battery.value - 4)
  }

  history.temperature.push(s.temperature.value)
  history.humidity.push(s.humidity.value)
  history.water.push(s.water.value)
  Object.keys(history).forEach(function (k) {
    if (history[k].length > 20) history[k].shift()
  })
}

const cardGrid = document.getElementById('cardGrid')

function displayValue(key) {
  const s = sensors[key]
  if (typeof s.value === 'number') {
    const digits = key === 'temperature' ? 1 : 0
    return s.value.toFixed(digits) + '<span class="unit">' + s.unit + '</span>'
  }
  return s.value
}

function buildCards() {
  cardGrid.innerHTML = ''
  Object.keys(sensors).forEach(function (key) {
    const card = document.createElement('article')
    card.className = 'card'
    card.id = 'card-' + key
    card.innerHTML =
      '<div class="card-top">' +
      '<span class="card-name">' +
      sensors[key].name +
      '</span>' +
      '<span class="card-icon">' +
      sensors[key].icon +
      '</span>' +
      '</div>' +
      '<div class="card-value" id="val-' +
      key +
      '">--</div>' +
      '<span class="pill safe" id="pill-' +
      key +
      '">SAFE</span>'
    cardGrid.appendChild(card)
  })
}

function renderCards() {
  Object.keys(sensors).forEach(function (key) {
    const status = sensorStatus(key, sensors[key].value)
    document.getElementById('val-' + key).innerHTML = displayValue(key)

    const card = document.getElementById('card-' + key)
    card.className = 'card ' + (status === 'safe' ? '' : status)

    const pill = document.getElementById('pill-' + key)
    pill.className = 'pill ' + status
    pill.textContent = status.toUpperCase()

    if (lastStatus[key] !== status && status !== 'safe') {
      addAlert(
        alertMessage(key, status),
        status === 'danger' ? 'danger' : 'warning',
      )
    }
    lastStatus[key] = status
  })
}

function alertMessage(key, status) {
  const v = sensors[key].value
  const num = typeof v === 'number' ? v.toFixed(0) : v
  const messages = {
    temperature: 'High temperature detected: ' + num + ' °C',
    humidity: 'Abnormal humidity reading: ' + num + ' %',
    gas: 'High gas / smoke level: ' + num + ' ppm',
    air: 'Air quality deteriorating: AQI ' + num,
    water: 'Water level rising: ' + num + ' cm',
    soil: 'Soil saturation high: ' + num + ' % (landslide risk)',
    battery: 'Low battery on solar unit: ' + num + ' %',
    rain: 'Rainfall status changed to ' + v,
    flame: 'Flame detected near sensor unit!',
    vibration: 'Ground vibration / loud sound detected',
  }
  const text = messages[key] || sensors[key].name + ' abnormal'
  return status === 'danger' ? 'DANGER: ' + text : text
}

function updateOverallStatus() {
  let danger = 0,
    warning = 0
  Object.keys(sensors).forEach(function (key) {
    const st = sensorStatus(key, sensors[key].value)
    if (st === 'danger') danger++
    else if (st === 'warning') warning++
  })

  let level = 'safe'
  if (danger >= 1) level = 'danger'
  else if (warning >= 2) level = 'danger'
  else if (warning === 1) level = 'warning'

  const panel = document.getElementById('statusPanel')
  panel.className = 'status-panel ' + level

  const texts = {
    safe: ['🟢', 'SAFE', 'All sensors within normal operating range.'],
    warning: [
      '🟡',
      'WARNING',
      'Some readings are abnormal. Field unit under close watch.',
    ],
    danger: [
      '🔴',
      'DANGER',
      'Critical conditions detected. Immediate response recommended.',
    ],
  }
  document.getElementById('statusEmoji').textContent = texts[level][0]
  document.getElementById('statusText').textContent = texts[level][1]
  document.getElementById('statusDesc').textContent = texts[level][2]

  if (lastStatus.__overall !== level) {
    if (level === 'danger')
      addAlert('Overall field status escalated to DANGER', 'danger')
    else if (level === 'warning')
      addAlert('Overall field status changed to WARNING', 'warning')
    else if (lastStatus.__overall)
      addAlert('Conditions normalised. Status back to SAFE', 'info')
    lastStatus.__overall = level
  }
}

function drawChart(elementId, data, max, statusFn) {
  const box = document.getElementById(elementId)
  box.innerHTML = ''
  data.forEach(function (v) {
    const bar = document.createElement('div')
    const st = statusFn(v)
    bar.className = 'bar ' + (st === 'safe' ? '' : st)
    bar.style.height = Math.max(3, (v / max) * 100) + '%'
    bar.title = v.toFixed(1)
    box.appendChild(bar)
  })
}

function renderCharts() {
  drawChart('chartTemp', history.temperature, 60, function (v) {
    return sensorStatus('temperature', v)
  })
  drawChart('chartHum', history.humidity, 100, function (v) {
    return sensorStatus('humidity', v)
  })
  drawChart('chartWater', history.water, 160, function (v) {
    return sensorStatus('water', v)
  })

  document.getElementById('chartNowTemp').textContent =
    sensors.temperature.value.toFixed(1) + ' °C'
  document.getElementById('chartNowHum').textContent =
    sensors.humidity.value.toFixed(0) + ' %'
  document.getElementById('chartNowWater').textContent =
    sensors.water.value.toFixed(0) + ' cm'
}

const alertList = document.getElementById('alertList')

function addAlert(message, severity) {
  const icons = { danger: '🚨', warning: '⚠️', info: 'ℹ️' }
  const item = document.createElement('li')
  item.className = 'alert-item ' + severity
  item.innerHTML =
    '<span class="alert-icon">' +
    icons[severity] +
    '</span>' +
    "<div><span class='alert-msg'>" +
    message +
    '</span>' +
    '<span class="alert-time">' +
    clockString() +
    '</span></div>' +
    '<span class="alert-sev">' +
    severity +
    '</span>'
  alertList.prepend(item)

  while (alertList.children.length > 25) {
    alertList.removeChild(alertList.lastChild)
  }
}

function updateGPS() {
  const lat = 19.9972 + rand(-0.00025, 0.00025)
  const lon = 73.7898 + rand(-0.00025, 0.00025)
  document.getElementById('gpsLat').textContent = lat.toFixed(5) + '° N'
  document.getElementById('gpsLon').textContent = lon.toFixed(5) + '° E'
}

function refresh() {
  updateSensorValues()
  renderCards()
  updateOverallStatus()
  renderCharts()
  updateGPS()
  document.getElementById('lastUpdated').textContent = clockString()

  if (scenarioOn && scenarioStep >= 9) {
    scenarioOn = false
    document.getElementById('scenarioState').textContent =
      'Mode: Disaster peak reached - holding'
  }
}

document.getElementById('btnScenario').addEventListener('click', function () {
  scenarioOn = true
  scenarioStep = 0
  document.getElementById('scenarioState').textContent =
    'Mode: Disaster scenario running...'
  addAlert('Disaster scenario simulation started', 'info')
  refresh()
})

document.getElementById('btnReset').addEventListener('click', function () {
  scenarioOn = false
  scenarioStep = 0
  sensors.temperature.value = 31
  sensors.humidity.value = 62
  sensors.gas.value = 180
  sensors.air.value = 70
  sensors.water.value = 40
  sensors.soil.value = 45
  sensors.battery.value = 92
  sensors.rain.value = 'Dry'
  sensors.flame.value = 'Not Detected'
  sensors.vibration.value = 'Not Detected'
  document.getElementById('scenarioState').textContent =
    'Mode: Normal monitoring'
  addAlert('System reset to normal monitoring mode', 'info')
  refresh()
})

document.getElementById('btnClear').addEventListener('click', function () {
  alertList.innerHTML = ''
})

buildCards()
addAlert('Sensor unit ESP32-FSU-01 online (solar power)', 'info')
refresh()
setInterval(refresh, 3000)
