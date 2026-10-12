"use client";

import { useCallback } from "react";
import type { Role } from "@/entities/session/@x/member";
import { format, useDictionary } from "@/shared/i18n";
import { Autocomplete } from "@/shared/ui";
import { searchMembers, type MemberMatch } from "../api/members";

interface MemberPickerProps {
  institutionId: string;
  /** Only members holding this role are searched. */
  role: Role;
  label: string;
  value: MemberMatch | null;
  onChange(member: MemberMatch | null): void;
  /** Leaves out whoever has not finished onboarding or was deactivated. */
  activeOnly?: boolean;
  /** Membership ids never offered, such as the Students a group already has. */
  exclude?: string[];
}

/**
 * Finds one member of an institution by name or document number. Nobody is
 * listed until something is typed: an institution has too many members to load.
 */
export function MemberPicker({
  institutionId,
  role,
  label,
  value,
  onChange,
  activeOnly = false,
  exclude,
}: MemberPickerProps) {
  const text = useDictionary().admin.memberSearch;
  const search = useCallback(
    async (query: string, signal: AbortSignal) => {
      const matches = await searchMembers(institutionId, role, query, signal, { activeOnly });
      return exclude ? matches.filter((match) => !exclude.includes(match.membershipId)) : matches;
    },
    [institutionId, role, activeOnly, exclude],
  );

  return (
    <Autocomplete<MemberMatch>
      label={label}
      placeholder={text.placeholder}
      value={value}
      onChange={onChange}
      search={search}
      getKey={(member) => member.membershipId}
      getLabel={(member) => `${member.firstName} ${member.lastName}`}
      getDetail={(member) =>
        [member.email, member.documentNumber && format(text.document, { number: member.documentNumber })]
          .filter(Boolean)
          .join(" · ")
      }
      messages={text}
    />
  );
}
