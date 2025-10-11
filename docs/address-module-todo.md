# Address Module TODO

- [x] Integrate geocoding provider abstraction (LocationIQ / OpenCage) and hydrate canonical fields before persistence.
- [x] Wire address capture flow into store onboarding (verified create form + geocoded primary address).
- [x] Extend customer onboarding flow to request verified delivery addresses (capture via admin modal).
- [x] Build admin tooling for manual address verification and reviewing archived assignments.
- [ ] Add delivery-facing APIs (routing distance, ETA) leveraging stored coordinates.
- [ ] Implement automated refresh jobs to re-validate coordinates and provider metadata periodically.
