# 共享组件库

## 基础组件

### Button

```tsx
import { Button } from '@/shared/components';

<Button variant="primary" size="md" onPress={() => {}}>
  点击我
</Button>

<Button variant="outline" loading>
  加载中...
</Button>
```

**Props:**
- `variant`: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `disabled`: boolean
- `loading`: boolean
- `accessibilityLabel`: string

### Input

```tsx
import { Input } from '@/shared/components';

<Input
  label="用户名"
  placeholder="请输入用户名"
  required
  error={errors.username}
/>
```

**Props:**
- `label`: string
- `error`: string
- `required`: boolean
- 支持所有 TextInput 属性

### Card

```tsx
import { Card } from '@/shared/components';

<Card variant="elevated">
  <Text>卡片内容</Text>
</Card>
```

**Props:**
- `variant`: 'default' | 'elevated' | 'outlined'

### Modal

```tsx
import { Modal } from '@/shared/components';

<Modal visible={visible} onClose={() => setVisible(false)}>
  <Modal.Header>
    <Text>标题</Text>
  </Modal.Header>
  <Modal.Body>
    <Text>内容</Text>
  </Modal.Body>
  <Modal.Footer>
    <Button variant="outline" onPress={() => setVisible(false)}>
      取消
    </Button>
    <Button onPress={handleConfirm}>确认</Button>
  </Modal.Footer>
</Modal>
```

### Drawer

```tsx
import { Drawer } from '@/shared/components';

<Drawer visible={visible} onClose={() => setVisible(false)} position="right">
  <Drawer.Header>
    <Text>菜单</Text>
  </Drawer.Header>
  <Drawer.Body>
    <Text>菜单项</Text>
  </Drawer.Body>
</Drawer>
```

**Props:**
- `position`: 'left' | 'right' | 'bottom'

### List

```tsx
import { List } from '@/shared/components';

<List
  data={items}
  renderItem={(item) => <Text>{item.name}</Text>}
  emptyMessage="暂无数据"
/>
```

## 主题系统

```tsx
import { ThemeProvider, useTheme } from '@/shared/components';

// 在应用顶层
<ThemeProvider theme="light" onToggleTheme={toggleTheme}>
  <App />
</ThemeProvider>

// 在组件中使用
const { theme, isDark, toggleTheme } = useTheme();
```
