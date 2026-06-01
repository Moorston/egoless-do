import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card, useTheme, useT, ScreenHeader } from '../../components/UI';
import { FONT_BODY, FONT_TITLE, FONT_SUB } from '@egoless-do/core';

export default function PrivacyPolicyScreen() {
  const nav = useNavigation();
  const TH  = useTheme();
  const T   = useT();
  const P   = TH.primary;

  const Section = ({ title, body }: { title: string; body: string }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={{ fontSize: FONT_BODY, fontWeight: '700', color: P, marginBottom: 8 }}>{title}</Text>
      <Text style={{ fontSize: FONT_BODY, color: TH.sub, lineHeight: 24 }}>{body}</Text>
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: TH.bg }}>
      <View style={{ padding: 16 }}>
        <ScreenHeader title={T('privacyTitle')} onBack={() => nav.goBack()} />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}>
        <Card style={{ padding: 16 }}>
          <Text style={{ fontSize: FONT_SUB, color: TH.sub, marginBottom: 20 }}>{T('privacyLastUpdated')}</Text>
          <Section title={T('privacyIntroTitle')} body={T('privacyIntro')} />
          <Section title={T('privacyCollectTitle')} body={T('privacyCollect')} />
          <Section title={T('privacyStorageTitle')} body={T('privacyStorage')} />
          <Section title={T('privacyThirdPartyTitle')} body={T('privacyThirdParty')} />
          <Section title={T('privacyRightsTitle')} body={T('privacyRights')} />
          <Section title={T('privacyContactTitle')} body={T('privacyContact')} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
