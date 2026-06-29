// ─── Modal Component (Compound) ──────────────────────────────────
import React, { createContext, useContext } from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  type ViewStyle,
} from 'react-native';

interface ModalContextType {
  visible: boolean;
  onClose: () => void;
}

const ModalContext = createContext<ModalContextType>({
  visible: false,
  onClose: () => {},
});

export interface ModalProps {
  children: React.ReactNode;
  visible: boolean;
  onClose: () => void;
  style?: ViewStyle;
}

export function Modal({ children, visible, onClose, style }: ModalProps) {
  return (
    <ModalContext.Provider value={{ visible, onClose }}>
      <RNModal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
      >
        <View style={styles.overlay}>
          <View style={[styles.content, style]}>
            {children}
          </View>
        </View>
      </RNModal>
    </ModalContext.Provider>
  );
}

function ModalHeader({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const { onClose } = useContext(ModalContext);
  return (
    <View style={[styles.header, style]}>
      <View style={styles.headerContent}>{children}</View>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

function ModalBody({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.body, style]}>{children}</View>;
}

function ModalFooter({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.footer, style]}>{children}</View>;
}

Modal.Header = ModalHeader;
Modal.Body = ModalBody;
Modal.Footer = ModalFooter;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
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
