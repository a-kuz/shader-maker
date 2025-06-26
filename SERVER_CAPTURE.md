# Server-Side Shader Capture

## Обзор

Серверное capturing позволяет автоматически создавать скриншоты шейдеров на сервере без участия клиента. Это обеспечивает:

- **Консистентность**: Одинаковый результат независимо от клиентского оборудования
- **Автоматизацию**: Полностью автоматический процесс создания и оценки шейдеров
- **Надежность**: Отсутствие зависимости от WebGL поддержки в браузере пользователя

## Как это работает

### 1. Изменение uniform iTime

Вместо записи анимации в реальном времени, серверный capturing:

1. Рендерит шейдер с заданными значениями `iTime`: `[0.1, 0.2, 0.5, 0.8, 1.2, 1.5, 3, 5, 10]`
2. Для каждого значения создает отдельный скриншот
3. Возвращает набор из 9 изображений, представляющих различные моменты анимации

### 2. Техническая реализация

- **Puppeteer**: Запускает headless Chrome с WebGL поддержкой
- **Vanilla WebGL**: Создает контекст без зависимостей от Three.js
- **Полноэкранный треугольник**: Эффективная геометрия для шейдеров
- **Базовые uniform'ы**: `iTime`, `iResolution`

## Использование

### Включение серверного capturing

В интерфейсе установите флажок "Server Capture" перед запуском процесса:

```typescript
const config = {
  maxIterations: 3,
  targetScore: 80,
  autoMode: true,
  serverCapture: true  // Включить серверное capturing
};
```

### Ручной запуск

Если процесс находится в состоянии "capturing", можно запустить серверный capture вручную через кнопку "🖥️ Server Capture" в Process Controls.

### API endpoint

```
POST /api/processes/{id}/server-capture
```

## Преимущества

1. **Стабильность**: Не зависит от производительности клиента
2. **Скорость**: Быстрое создание скриншотов без ожидания пользователя
3. **Качество**: Высокое разрешение и стабильный framerate
4. **Автоматизация**: Полностью автоматический процесс для auto-mode

## Ограничения

1. **Ресурсы сервера**: Требует вычислительных ресурсов на сервере
2. **Puppeteer зависимость**: Необходим запущенный Chrome
3. **WebGL поддержка**: Сервер должен поддерживать hardware acceleration

## Конфигурация

### Настройки capturing

```typescript
interface CaptureOptions {
  width?: number;           // Ширина скриншота (по умолчанию: 1280)
  height?: number;          // Высота скриншота (по умолчанию: 720)
  timeValues?: number[];    // Значения iTime для захвата
}

const DEFAULT_TIME_VALUES = [0.1, 0.2, 0.5, 0.8, 1.2, 1.5, 3, 5, 10];
```

### Puppeteer настройки

```typescript
const browserArgs = [
  '--use-gl=egl',
  '--enable-webgl',
  '--enable-features=VizDisplayCompositor',
  '--disable-web-security',
  '--no-sandbox',
  '--disable-setuid-sandbox'
];
```

## Пример шейдера

Серверный capture поддерживает стандартные шейдеры с uniform'ами:

```glsl
precision mediump float;
uniform float iTime;
uniform vec2 iResolution;

void main() {
    vec2 uv = gl_FragCoord.xy / iResolution.xy;
    vec3 col = 0.5 + 0.5 * cos(iTime + uv.xyx + vec3(0, 2, 4));
    gl_FragColor = vec4(col, 1.0);
}
```

## Логирование

Процесс серверного capturing подробно логируется:

```
🎬 Starting server-side capture for process {processId}
📸 Shader ready, capturing screenshots with time values: 0.1, 0.2, 0.5, 0.8, 1.2, 1.5, 3, 5, 10
📷 Captured screenshot 1/9 (time: 0.1)
✅ Server capture completed: 9 screenshots
``` 