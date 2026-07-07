// ─── Unified Network Status ────────────────────────────────────────
// Single source of truth for network connectivity across the app.
import NetInfo from '@react-native-community/netinfo';
import { create } from 'zustand';

interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean;
}

export const useNetworkStatus = create<NetworkStatus>()((set) => {
  // Initialize with current state
  NetInfo.fetch().then(state => {
    set({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
    });
  }).catch(() => {});

  // Listen for changes
  NetInfo.addEventListener(state => {
    set({
      isConnected: state.isConnected ?? false,
      isInternetReachable: state.isInternetReachable ?? false,
    });
  });

  return {
    isConnected: true, // optimistic default
    isInternetReachable: true,
  };
});
