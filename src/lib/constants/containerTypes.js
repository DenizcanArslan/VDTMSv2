export const CONTAINER_TYPES = [
  { value: '20HR', label: '20HR', requiresGenset: true },
  { value: '20NOR', label: '20NOR', requiresGenset: false },
  { value: '20DV', label: '20DV', requiresGenset: false },
  { value: '20OT', label: '20OT', requiresGenset: false },
  { value: '40HC', label: '40HC', requiresGenset: false },
  { value: '40HR', label: '40HR', requiresGenset: true },
  { value: '40NOR', label: '40NOR', requiresGenset: false },
  { value: '40OT', label: '40OT', requiresGenset: false },
];

export const isGensetRequired = (containerType) => {
  return CONTAINER_TYPES.find(type => type.value === containerType)?.requiresGenset || false;
}; 