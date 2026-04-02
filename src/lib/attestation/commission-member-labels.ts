/** DB values: `head` | `member` */
export function commissionMemberRoleLabelUk(role: string): string {
  switch (role) {
    case "head":
      return "Голова комісії";
    case "member":
      return "Член комісії";
    default:
      return role;
  }
}
