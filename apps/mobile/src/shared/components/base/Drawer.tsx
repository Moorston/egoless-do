// ─── Drawer Component (Compound) ─────────────────────────────────
import React, { createContext, useContext } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

interface DrawerContextType {
  visible: boolean;
  onClose: () => void;
}

const DrawerContext = createContext<DrawerContextType>({
  visible: false,
  onClose: () => {},
});

export interface DrawerProps {
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
  position?: 'left' | 'right' | 'bottom';
  style?: ViewStyle;
}

export function Drawer({
  children,
  visible,
  onClose,
  position = 'right',
  style,
}: DrawerProps) {
  return (
    <DrawerContext.Provider value={{ visible, onClose }}>
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            onPress={onClose}
            activeOpacity={1}
          />
          <View
            style={[
              styles.drawer,
              positionStyles[position],
              style,
            ]}
          >
            {children}
          </View>
        </View>
      </Modal>
    </DrawerContext.Provider>
  );
}

function DrawerHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { onClose } = useContext(DrawerContext);
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerContent}>{children}</View>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

function DrawerBody({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.body, style]}>{children}</View>;
}

function DrawerFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

Drawer.Header = DrawerHeader;
Drawer.Body = DrawerBody;
Drawer.Footer = DrawerFooter;

const positionStyles: Record<string, ViewStyle> = {
  left: {
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
  },
  right: {
    right: 0,
    top: 0,
    bottom: 0,
    width: '80%',
  },
  bottom: {
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: '70%',
  },
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 24,
    color: '#6B7280',
    fontWeight: '300',
  },
  body: {
    flex: 1,
    padding: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
});
