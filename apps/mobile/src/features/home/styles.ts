// Shared home-screen styles — extracted from HomeScreen.tsx to allow
// sub-components (WeightCard, WaterCard, …) to use the same definitions.
export const styles = {
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' as const, alignItems: 'center' as const },
  flexRowGap6: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  flexRowGap10: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 10 },
  flexRowBetween: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },
  center: { alignItems: 'center' as const },
  centerFlex1: { alignItems: 'center' as const, flex: 1 },
  padding6: { padding: 6 },
  marginTop4: { marginTop: 4 },
  marginTop10: { marginTop: 10 },
  card: { borderRadius: 16, padding: 16, marginBottom: 12 },
  cardWithBorder: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1 },
  cardPadded: { borderRadius: 16, padding: 14, marginBottom: 12 },
  pillBadge: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6 },
  separator: { width: 1, height: 40 },
  // Text styles (theme-dependent, use with array merge)
  textBold: { fontWeight: '600' as const },
  textSemiBold: { fontWeight: '700' as const },
  textExtraBold: { fontWeight: '800' as const },
  whiteText: { color: '#fff' },
  whiteTextBold: { color: '#fff', fontWeight: '700' as const },
  whiteTextExtraBold: { color: '#fff', fontWeight: '800' as const },
  whiteSubText: { color: 'rgba(255,255,255,.6)' },
  whiteDimText: { color: 'rgba(255,255,255,.5)' },
  whiteSeparator: { backgroundColor: 'rgba(255,255,255,.2)' },
};
