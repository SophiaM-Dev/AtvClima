
"use strict";

const dashboard = document.querySelector(".weather-dashboard");
const form = document.getElementById("weatherForm");
const cityInput = document.getElementById("cityInput");
const countryInput = document.getElementById("countryInput");
const apiKeyInput = document.getElementById("apiKeyInput");

const loadingMessage = document.getElementById("loadingMessage");
const errorMessage = document.getElementById("errorMessage");
const resultSection = document.getElementById("resultSection");

const historyList = document.getElementById("historyList");
const favoriteButton = document.getElementById("favoriteButton");
const favoriteSearchButton = document.getElementById("favoriteSearchButton");
const themeButton = document.getElementById("themeButton");

const mqttStatus = document.getElementById("mqttStatus");
const mqttButton = document.getElementById("mqttButton");
const publishButton = document.getElementById("publishButton");

const API_BASE = "https://api.openweathermap.org/data/2.5";
const MQTT_URL = "wss://test.mosquitto.org:8081";

const HISTORY_KEY = "deliveryWeatherHistory";
const FAVORITE_KEY = "deliveryWeatherFavorite";
const THEME_KEY = "deliveryWeatherTheme";
const API_KEY_STORAGE = "deliveryWeatherApiKey";

let currentWeather = null;
let currentForecast = null;
let currentCity = null;
let weatherChart = null;
let mqttClient = null;
let requestController = null;

apiKeyInput.value = localStorage.getItem(API_KEY_STORAGE) || "";

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.hidden = false;
}

function clearError() {
    errorMessage.textContent = "";
    errorMessage.hidden = true;
}

function setLoading(isLoading) {
    loadingMessage.hidden = !isLoading;

    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = isLoading;
}

function getApiKey() {
    return apiKeyInput.value.trim();
}

function getWeatherIcon(condition) {
    const icons = {
        Clear: "☀️",
        Clouds: "☁️",
        Rain: "🌧️",
        Drizzle: "🌦️",
        Thunderstorm: "⛈️",
        Snow: "❄️",
        Mist: "🌫️",
        Fog: "🌫️",
        Haze: "🌫️"
    };

    return icons[condition] || "🌤️";
}

function formatTime(timestamp, timezoneOffset) {
    const date = new Date((timestamp + timezoneOffset) * 1000);

    return date.toLocaleTimeString("pt-BR", {
        timeZone: "UTC",
        hour: "2-digit",
        minute: "2-digit"
    });
}

function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleString("pt-BR");
}

function getWindDirection(degrees) {
    if (typeof degrees !== "number") {
        return "Direção não disponível";
    }

    const directions = [
        "Norte", "Nordeste", "Leste", "Sudeste",
        "Sul", "Sudoeste", "Oeste", "Noroeste"
    ];

    return directions[Math.round(degrees / 45) % 8];
}

async function fetchJson(url) {
    const response = await fetch(url, {
        signal: requestController.signal
    });

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("O serviço retornou uma resposta inválida.");
    }

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error("Cidade não encontrada. Confira o nome e o país.");
        }

        if (response.status === 401) {
            throw new Error("API Key inválida ou ainda não ativada.");
        }

        if (response.status === 429) {
            throw new Error("Limite de consultas atingido. Tente mais tarde.");
        }

        throw new Error(data.message || "Não foi possível consultar os dados.");
    }

    return data;
}

async function consultWeather(city, country) {
    const apiKey = getApiKey();

    if (!city.trim()) {
        showError("Informe uma cidade antes de realizar a consulta.");
        cityInput.focus();
        return;
    }

    if (!apiKey) {
        showError("Informe sua API Key da OpenWeatherMap.");
        apiKeyInput.focus();
        return;
    }

    if (requestController) {
        requestController.abort();
    }

    requestController = new AbortController();
    clearError();
    setLoading(true);

    try {
        const location = `${city.trim()},${country}`;

        const weatherUrl =
            `${API_BASE}/weather?q=${encodeURIComponent(location)}` +
            `&appid=${encodeURIComponent(apiKey)}&units=metric&lang=pt_br`;

        const forecastUrl =
            `${API_BASE}/forecast?q=${encodeURIComponent(location)}` +
            `&appid=${encodeURIComponent(apiKey)}&units=metric&lang=pt_br`;

        const [weather, forecast] = await Promise.all([
            fetchJson(weatherUrl),
            fetchJson(forecastUrl)
        ]);

        currentWeather = weather;
        currentForecast = forecast;
        currentCity = {
            name: weather.name,
            country: weather.sys.country
        };

        displayWeather(weather, forecast);
        addHistory(weather);
        resultSection.hidden = false;

    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }

        showError(
            error instanceof TypeError
                ? "Não foi possível conectar à API. Verifique sua internet."
                : error.message || "Ocorreu um erro ao consultar o clima."
        );
    } finally {
        setLoading(false);
    }
}

function displayWeather(weather, forecast) {
    const condition = weather.weather?.[0]?.main || "";
    const description = weather.weather?.[0]?.description || "Sem descrição";

    document.getElementById("locationName").textContent =
        `${weather.name}, ${weather.sys.country}`;

    document.getElementById("weatherDescription").textContent =
        description.charAt(0).toUpperCase() + description.slice(1);

    const icon = document.getElementById("weatherIcon");
    icon.textContent = getWeatherIcon(condition);
    icon.setAttribute("aria-label", description);

    document.getElementById("temperatureValue").textContent =
        `${Math.round(weather.main.temp)} °C`;

    document.getElementById("feelsLikeValue").textContent =
        `${Math.round(weather.main.feels_like)} °C`;

    document.getElementById("humidityValue").textContent =
        `${weather.main.humidity}%`;

    document.getElementById("windValue").textContent =
        `${Math.round((weather.wind?.speed || 0) * 3.6)} km/h`;

    document.getElementById("windDirection").textContent =
        getWindDirection(weather.wind?.deg);

    document.getElementById("pressureValue").textContent =
        `${weather.main.pressure} hPa`;

    const todayForecast = forecast.list.filter(item => {
        const localDay = new Date(
            (item.dt + weather.timezone) * 1000
        ).getUTCDate();

        const currentDay = new Date(
            (weather.dt + weather.timezone) * 1000
        ).getUTCDate();

        return localDay === currentDay;
    });

    const temperatures = todayForecast.map(item => item.main.temp);

    document.getElementById("minValue").textContent =
        `${Math.round(temperatures.length
            ? Math.min(...temperatures)
            : weather.main.temp_min)} °C`;

    document.getElementById("maxValue").textContent =
        `${Math.round(temperatures.length
            ? Math.max(...temperatures)
            : weather.main.temp_max)} °C`;

    document.getElementById("sunriseValue").textContent =
        `Nascer: ${formatTime(weather.sys.sunrise, weather.timezone)}`;

    document.getElementById("sunsetValue").textContent =
        `Pôr do sol: ${formatTime(weather.sys.sunset, weather.timezone)}`;

    document.getElementById("updateTime").textContent =
        new Date().toLocaleString("pt-BR");

    updateDeliveryAlert(weather);
    updateChart(forecast);
}

function updateDeliveryAlert(weather) {
    const condition = weather.weather?.[0]?.main;
    const windSpeed = (weather.wind?.speed || 0) * 3.6;
    const temperature = weather.main.temp;

    let message = "Condições sem alertas automáticos importantes. " +
        "Confira sempre a situação real antes de sair para uma entrega.";

    if (["Thunderstorm", "Snow"].includes(condition)) {
        message = "Atenção elevada: condição meteorológica potencialmente " +
            "adversa. Avalie a segurança das entregas.";
    } else if (condition === "Rain" || condition === "Drizzle") {
        message = "Atenção: há indicação de chuva. Considere o tempo " +
            "adicional e os cuidados necessários nas entregas.";
    } else if (windSpeed >= 40) {
        message = "Atenção: vento forte. Avalie as condições de segurança.";
    } else if (temperature >= 35) {
        message = "Atenção: temperatura elevada. Considere hidratação " +
            "e pausas adequadas para a equipe.";
    } else if (temperature <= 5) {
        message = "Atenção: temperatura muito baixa. Considere as " +
            "condições locais antes das entregas.";
    }

    document.getElementById("deliveryAlert").textContent = message;
}

function updateChart(forecast) {
    const entries = forecast.list.slice(0, 8);

    const labels = entries.map(item =>
        new Date(item.dt * 1000).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        })
    );

    const temperatures = entries.map(item => item.main.temp);
    const humidity = entries.map(item => item.main.humidity);

    const context = document.getElementById("weatherChart");

    if (weatherChart) {
        weatherChart.destroy();
    }

    weatherChart = new Chart(context, {
        type: "line",
        data: {
            labels,
            datasets: [
                {
                    label: "Temperatura (°C)",
                    data: temperatures,
                    borderColor: "#087e8b",
                    backgroundColor: "rgba(8, 126, 139, 0.12)",
                    yAxisID: "temperature",
                    tension: 0.35
                },
                {
                    label: "Umidade (%)",
                    data: humidity,
                    borderColor: "#e49b35",
                    backgroundColor: "rgba(228, 155, 53, 0.12)",
                    yAxisID: "humidity",
                    tension: 0.35
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom"
                },
                title: {
                    display: true,
                    text: "Previsão meteorológica"
                }
            },
            scales: {
                temperature: {
                    type: "linear",
                    position: "left",
                    title: {
                        display: true,
                        text: "Temperatura (°C)"
                    }
                },
                humidity: {
                    type: "linear",
                    position: "right",
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: "Umidade (%)"
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function getHistory() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    } catch {
        return [];
    }
}

function addHistory(weather) {
    const history = getHistory();

    history.unshift({
        name: weather.name,
        country: weather.sys.country,
        temp: Math.round(weather.main.temp),
        humidity: weather.main.humidity,
        city: weather.name,
        date: Date.now()
    });

    const uniqueHistory = history.filter((item, index, array) =>
        array.findIndex(other =>
            other.name === item.name &&
            other.country === item.country
        ) === index
    ).slice(0, 8);

    localStorage.setItem(HISTORY_KEY, JSON.stringify(uniqueHistory));
    renderHistory();
}

function renderHistory() {
    const history = getHistory();
    historyList.replaceChildren();

    if (!history.length) {
        const item = document.createElement("li");
        item.textContent = "Nenhuma consulta realizada.";
        historyList.appendChild(item);
        return;
    }

    history.forEach(entry => {
        const item = document.createElement("li");
        const description = document.createElement("span");

        description.textContent =
            `${entry.name}, ${entry.country}: ${entry.temp} °C, ` +
            `${entry.humidity}% de umidade. `;

        const button = document.createElement("button");
        button.type = "button";
        button.className = "weather-button secondary";
        button.textContent = "Consultar";
        button.setAttribute(
            "aria-label",
            `Consultar clima de ${entry.name}, ${entry.country}`
        );

        button.addEventListener("click", () => {
            cityInput.value = entry.city;
            countryInput.value = entry.country;
            consultWeather(entry.city, entry.country);
        });

        item.append(description, button);
        historyList.appendChild(item);
    });
}

function saveFavorite() {
    if (!currentCity) {
        showError("Consulte uma cidade antes de salvá-la como favorita.");
        return;
    }

    localStorage.setItem(FAVORITE_KEY, JSON.stringify(currentCity));
    favoriteButton.textContent = "★ Cidade favorita salva";
    clearError();
}

function searchFavorite() {
    try {
        const favorite = JSON.parse(localStorage.getItem(FAVORITE_KEY));

        if (!favorite?.name || !favorite?.country) {
            showError("Você ainda não salvou uma cidade favorita.");
            return;
        }

        cityInput.value = favorite.name;
        countryInput.value = favorite.country;
        consultWeather(favorite.name, favorite.country);
    } catch {
        showError("Não foi possível ler a cidade favorita.");
    }
}

function applyTheme(theme) {
    const dark = theme === "dark";

    dashboard.classList.toggle("dark-theme", dark);
    themeButton.setAttribute("aria-pressed", String(dark));
    themeButton.textContent = dark ? "Ativar tema claro" : "Ativar tema escuro";

    localStorage.setItem(THEME_KEY, theme);
}

function connectMqtt() {
    if (typeof mqtt === "undefined") {
        mqttStatus.textContent = "Biblioteca MQTT indisponível.";
        return;
    }

    if (mqttClient?.connected) {
        mqttStatus.textContent = "MQTT já está conectado.";
        return;
    }

    mqttStatus.textContent = "Conectando ao broker MQTT...";
    mqttButton.disabled = true;

    try {
        mqttClient = mqtt.connect(MQTT_URL, {
            connectTimeout: 8000,
            reconnectPeriod: 0,
            clientId: "delivery_web_" +
                Math.random().toString(16).slice(2, 10)
        });

        mqttClient.on("connect", () => {
            mqttStatus.textContent = "MQTT conectado.";
            mqttButton.textContent = "MQTT conectado";
            publishButton.disabled = !currentWeather;
            mqttButton.disabled = false;
        });

        mqttClient.on("error", () => {
            mqttStatus.textContent =
                "Não foi possível conectar ao MQTT. Tente novamente.";
            mqttButton.disabled = false;
            publishButton.disabled = true;
        });

        mqttClient.on("close", () => {
            publishButton.disabled = true;
            mqttButton.disabled = false;
            mqttButton.textContent = "Conectar MQTT";

            if (mqttStatus.textContent === "MQTT conectado.") {
                mqttStatus.textContent = "MQTT desconectado.";
            }
        });
    } catch {
        mqttStatus.textContent = "Falha ao iniciar a conexão MQTT.";
        mqttButton.disabled = false;
    }
}

function publishWeather() {
    if (!mqttClient?.connected || !currentWeather) {
        mqttStatus.textContent =
            "Conecte o MQTT e consulte uma cidade primeiro.";
        return;
    }

    const payload = {
        city: currentWeather.name,
        country: currentWeather.sys.country,
        temperature: currentWeather.main.temp,
        humidity: currentWeather.main.humidity,
        windKmh: Math.round((currentWeather.wind?.speed || 0) * 3.6),
        condition: currentWeather.weather?.[0]?.description,
        timestamp: new Date().toISOString()
    };

    mqttClient.publish(
        "delivery/weather/status",
        JSON.stringify(payload),
        { qos: 0 },
        error => {
            mqttStatus.textContent = error
                ? "Não foi possível publicar os dados."
                : "Resumo meteorológico publicado no MQTT.";
        }
    );
}

form.addEventListener("submit", event => {
    event.preventDefault();
    consultWeather(cityInput.value, countryInput.value);
});

document.getElementById("saveApiKeyButton").addEventListener("click", () => {
    const key = getApiKey();

    if (!key) {
        showError("Informe uma API Key antes de salvar.");
        apiKeyInput.focus();
        return;
    }

    localStorage.setItem(API_KEY_STORAGE, key);
    clearError();
    alert("Chave salva neste navegador.");
});

favoriteButton.addEventListener("click", saveFavorite);
favoriteSearchButton.addEventListener("click", searchFavorite);

themeButton.addEventListener("click", () => {
    const isDark = dashboard.classList.contains("dark-theme");
    applyTheme(isDark ? "light" : "dark");
});

document.getElementById("clearHistoryButton").addEventListener("click", () => {
    localStorage.removeItem(HISTORY_KEY);
    renderHistory();
});

mqttButton.addEventListener("click", connectMqtt);
publishButton.addEventListener("click", publishWeather);

applyTheme(localStorage.getItem(THEME_KEY) || "light");
renderHistory();
