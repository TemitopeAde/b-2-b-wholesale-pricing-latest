import { members } from '@wix/members';



export async function getCurrentMember() {
  try {
    const options = { fieldsets: ['FULL'] };
    const member = await members.getCurrentMember(options as any);
    return member;
  } catch {
    return undefined;
  }
}




