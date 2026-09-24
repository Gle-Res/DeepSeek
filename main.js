const { app, BrowserWindow } = require('electron')
const path = require('path')
const fs = require('fs')

let mainWindow = null

const exePath = process.execPath
const exeDir = path.dirname(exePath)
const cacheDir = path.join(exeDir, "resources", "app", "cache")

if (!fs.existsSync(cacheDir)) {
  fs.mkdirSync(cacheDir, { recursive: true })
}
app.setPath("userData", cacheDir)

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "DeepSeek - 探索未至之境",
    frame: true, 
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  mainWindow.setMenu(null)

  mainWindow.loadURL("https://chat.deepseek.com")

  mainWindow.on('page-title-updated', (e) => {
    e.preventDefault()
    mainWindow.setTitle('DeepSeek - 探索未至之境')
  })

  mainWindow.webContents.on("devtools-opened", () => {
    mainWindow.webContents.closeDevTools()
  })

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (
      input.key === "F12" ||
      (input.control && input.shift && input.key.toLowerCase() === "i") ||
      (input.control && input.key.toLowerCase() === "u")
    ) {
      event.preventDefault()
    }
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

app.whenReady().then(createWindow)

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit()
})