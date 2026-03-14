export interface HpoPhenotypeOption {
  category: string;
  label: string;
  value: string;
}

export const hpoPhenotypeOptions: HpoPhenotypeOption[] = [
  {
    category: "Hereditary Breast/Ovarian",
    label: "Breast carcinoma",
    value: "Breast carcinoma",
  },
  {
    category: "Hereditary Breast/Ovarian",
    label: "Ovarian neoplasm",
    value: "Ovarian neoplasm",
  },
  {
    category: "Gastrointestinal",
    label: "Colorectal carcinoma",
    value: "Colorectal carcinoma",
  },
  {
    category: "Gastrointestinal",
    label: "Adenomatous colonic polyposis",
    value: "Adenomatous colonic polyposis",
  },
  {
    category: "Pancreatic",
    label: "Pancreatic neoplasm",
    value: "Pancreatic neoplasm",
  },
  {
    category: "Urologic",
    label: "Prostate carcinoma",
    value: "Prostate carcinoma",
  },
  {
    category: "Endocrine",
    label: "Thyroid carcinoma",
    value: "Thyroid carcinoma",
  },
  {
    category: "Melanoma",
    label: "Cutaneous melanoma",
    value: "Cutaneous melanoma",
  },
  {
    category: "Syndromic",
    label: "Multiple primary neoplasms",
    value: "Multiple primary neoplasms",
  },
  {
    category: "Syndromic",
    label: "Macrocephaly",
    value: "Macrocephaly",
  },
  {
    category: "Family History",
    label: "Family history of breast cancer",
    value: "Family history of breast cancer",
  },
  {
    category: "Family History",
    label: "Early-onset malignancy",
    value: "Early-onset malignancy",
  },
];
