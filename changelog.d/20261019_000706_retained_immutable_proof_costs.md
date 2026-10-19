### Changed

- Add an explicit synchronous proof-DATA policy that retains only completed
  recursively frozen arithmetic costs across legacy callbacks, with fresh native
  guards and unchanged logical quotas. The default derive constructor and the
  core-adoption constructor select this policy; the prior explicit scope retains
  its clear-before-callback contract. Every scope still closes synchronously and
  shares its original nonrefundable4096 admission budget. Original13/derive4 and
  full-corpus CLI deadlines remain unqualified; no source or owner verdict is cached.
