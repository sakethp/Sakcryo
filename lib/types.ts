export const GENDER_OPTIONS = [
  { value: "woman", label: "Women" },
  { value: "man", label: "Men" },
  { value: "non_binary", label: "Non-binary people" },
  { value: "another_identity", label: "Another identity" },
] as const;

export type Gender = (typeof GENDER_OPTIONS)[number]["value"];

export type Profile = {
  user_id: string;
  display_name: string;
  gender: Gender;
  bio: string;
  preferred_genders: Gender[];
  max_distance_km: number;
};

export type DiscoveryCandidate = {
  candidate_id: string;
  display_name: string;
  gender: Gender;
  bio: string;
  distance_km: number;
};

export type MatchSummary = {
  match_id: string;
  partner_id: string;
  partner_name: string;
  partner_gender: Gender;
  partner_bio: string;
  created_at: string;
};

export type ChatOverview = {
  match_id: string;
  partner_id: string;
  partner_name: string;
  partner_gender: Gender;
};

export type ChatMessage = {
  id: string;
  match_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
