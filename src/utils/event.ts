import { auth } from '@wix/essentials';
import { appInstances } from '@wix/app-management';
import {
  hasInstallGuideBeenSent,
  markInstallGuideSent,
  sendInstallGuideEmail,
} from '../backend/pricing.client';

const elevatedGetAppInstance = auth.elevate(appInstances.getAppInstance);

appInstances.onAppInstanceInstalled(async (event) => {
  const instanceId = event?.metadata?.instanceId || null;

  if (!instanceId) {
    return;
  }

  try {
    const alreadySent = await hasInstallGuideBeenSent(instanceId);

    if (alreadySent) {
      return;
    }

    const appInstance = await elevatedGetAppInstance();
    const ownerEmail = appInstance?.site?.ownerInfo?.email || null;

    if (!ownerEmail) {
      return;
    }

    const result = await sendInstallGuideEmail(ownerEmail);

    if (!result?.success) {
      return;
    }

    await markInstallGuideSent(instanceId);
  } catch {
    // Suppress error
  }
});
