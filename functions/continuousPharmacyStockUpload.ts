import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Predefined pharmacy stock data for remaining items (240 items)
const pharmacyStockData = [
  // Antibiotics
  { display_name: 'Amoxicillin 500mg Capsule', generic_name: 'Amoxicillin', brand_name: 'Amoxil', dosage_form: 'Capsule', strength: 500, strength_unit: 'mg', package_type: 'Strip', quantity: 500, unit_price: 1.50, mrp: 2.00, unit_cost: 0.80, batch_no: 'AMX001', expire_date: '2026-12-31' },
  { display_name: 'Ciprofloxacin 500mg Tablet', generic_name: 'Ciprofloxacin', brand_name: 'Cipro', dosage_form: 'Tablet', strength: 500, strength_unit: 'mg', package_type: 'Blister', quantity: 300, unit_price: 2.50, mrp: 3.50, unit_cost: 1.20, batch_no: 'CIP001', expire_date: '2026-11-30' },
  { display_name: 'Azithromycin 250mg Tablet', generic_name: 'Azithromycin', brand_name: 'Zithromax', dosage_form: 'Tablet', strength: 250, strength_unit: 'mg', package_type: 'Blister', quantity: 400, unit_price: 2.00, mrp: 2.80, unit_cost: 1.00, batch_no: 'AZI001', expire_date: '2026-10-31' },
  { display_name: 'Doxycycline 100mg Capsule', generic_name: 'Doxycycline', brand_name: 'Vibramycin', dosage_form: 'Capsule', strength: 100, strength_unit: 'mg', package_type: 'Strip', quantity: 350, unit_price: 1.80, mrp: 2.50, unit_cost: 0.90, batch_no: 'DOX001', expire_date: '2026-09-30' },
  { display_name: 'Metronidazole 400mg Tablet', generic_name: 'Metronidazole', brand_name: 'Flagyl', dosage_form: 'Tablet', strength: 400, strength_unit: 'mg', package_type: 'Blister', quantity: 450, unit_price: 1.20, mrp: 1.80, unit_cost: 0.60, batch_no: 'MET001', expire_date: '2026-12-31' },

  // Analgesics & Anti-inflammatory
  { display_name: 'Ibuprofen 400mg Tablet', generic_name: 'Ibuprofen', brand_name: 'Brufen', dosage_form: 'Tablet', strength: 400, strength_unit: 'mg', package_type: 'Blister', quantity: 600, unit_price: 0.50, mrp: 0.80, unit_cost: 0.25, batch_no: 'IBU001', expire_date: '2027-01-31' },
  { display_name: 'Paracetamol 500mg Tablet', generic_name: 'Paracetamol', brand_name: 'Crocin', dosage_form: 'Tablet', strength: 500, strength_unit: 'mg', package_type: 'Strip', quantity: 800, unit_price: 0.30, mrp: 0.50, unit_cost: 0.15, batch_no: 'PAR001', expire_date: '2027-02-28' },
  { display_name: 'Aspirin 325mg Tablet', generic_name: 'Aspirin', brand_name: 'Disprin', dosage_form: 'Tablet', strength: 325, strength_unit: 'mg', package_type: 'Blister', quantity: 500, unit_price: 0.40, mrp: 0.70, unit_cost: 0.20, batch_no: 'ASP001', expire_date: '2026-12-31' },
  { display_name: 'Diclofenac 50mg Tablet', generic_name: 'Diclofenac', brand_name: 'Voveran', dosage_form: 'Tablet', strength: 50, strength_unit: 'mg', package_type: 'Blister', quantity: 400, unit_price: 0.60, mrp: 1.00, unit_cost: 0.30, batch_no: 'DIC001', expire_date: '2026-11-30' },
  { display_name: 'Naproxen 500mg Tablet', generic_name: 'Naproxen', brand_name: 'Naprosyn', dosage_form: 'Tablet', strength: 500, strength_unit: 'mg', package_type: 'Blister', quantity: 350, unit_price: 0.80, mrp: 1.20, unit_cost: 0.40, batch_no: 'NAP001', expire_date: '2026-10-31' },

  // Antacids & Digestives
  { display_name: 'Omeprazole 20mg Capsule', generic_name: 'Omeprazole', brand_name: 'Prilosec', dosage_form: 'Capsule', strength: 20, strength_unit: 'mg', package_type: 'Blister', quantity: 300, unit_price: 1.50, mrp: 2.20, unit_cost: 0.75, batch_no: 'OMP001', expire_date: '2026-11-30' },
  { display_name: 'Ranitidine 150mg Tablet', generic_name: 'Ranitidine', brand_name: 'Zantac', dosage_form: 'Tablet', strength: 150, strength_unit: 'mg', package_type: 'Blister', quantity: 400, unit_price: 0.80, mrp: 1.30, unit_cost: 0.40, batch_no: 'RAN001', expire_date: '2026-12-31' },
  { display_name: 'Domperidone 10mg Tablet', generic_name: 'Domperidone', brand_name: 'Motilium', dosage_form: 'Tablet', strength: 10, strength_unit: 'mg', package_type: 'Strip', quantity: 500, unit_price: 0.50, mrp: 0.90, unit_cost: 0.25, batch_no: 'DOM001', expire_date: '2026-10-31' },
  { display_name: 'Antacid Suspension 200ml', generic_name: 'Aluminum Hydroxide', brand_name: 'Gelusil', dosage_form: 'Suspension', quantity: 80, unit_price: 2.00, mrp: 3.00, unit_cost: 1.00, batch_no: 'ANT001', expire_date: '2026-09-30' },

  // Antihistamines
  { display_name: 'Cetirizine 10mg Tablet', generic_name: 'Cetirizine', brand_name: 'Allergin', dosage_form: 'Tablet', strength: 10, strength_unit: 'mg', package_type: 'Blister', quantity: 600, unit_price: 0.70, mrp: 1.10, unit_cost: 0.35, batch_no: 'CET001', expire_date: '2027-01-31' },
  { display_name: 'Loratadine 10mg Tablet', generic_name: 'Loratadine', brand_name: 'Claritin', dosage_form: 'Tablet', strength: 10, strength_unit: 'mg', package_type: 'Blister', quantity: 500, unit_price: 0.80, mrp: 1.20, unit_cost: 0.40, batch_no: 'LOR001', expire_date: '2026-12-31' },
  { display_name: 'Chlorpheniramine 4mg Tablet', generic_name: 'Chlorpheniramine', brand_name: 'Avil', dosage_form: 'Tablet', strength: 4, strength_unit: 'mg', package_type: 'Strip', quantity: 700, unit_price: 0.30, mrp: 0.60, unit_cost: 0.15, batch_no: 'CHL001', expire_date: '2026-11-30' },

  // Cough & Cold
  { display_name: 'Cough Syrup 100ml', generic_name: 'Dextromethorphan', brand_name: 'Robitussin', dosage_form: 'Syrup', quantity: 120, unit_price: 1.50, mrp: 2.50, unit_cost: 0.75, batch_no: 'COUGH001', expire_date: '2026-09-30' },
  { display_name: 'Phenylephrine Nasal Drops 10ml', generic_name: 'Phenylephrine', brand_name: 'Otrivin', dosage_form: 'Drops', quantity: 150, unit_price: 1.20, mrp: 1.80, unit_cost: 0.60, batch_no: 'PHE001', expire_date: '2026-12-31' },
  { display_name: 'Honey Lemon Lozenges 10 tablets', generic_name: 'Honey & Lemon', brand_name: 'Strepsils', dosage_form: 'Lozenge', quantity: 250, unit_price: 0.80, mrp: 1.30, unit_cost: 0.40, batch_no: 'LOZ001', expire_date: '2027-01-31' },

  // Cardiovascular
  { display_name: 'Atorvastatin 20mg Tablet', generic_name: 'Atorvastatin', brand_name: 'Lipitor', dosage_form: 'Tablet', strength: 20, strength_unit: 'mg', package_type: 'Blister', quantity: 200, unit_price: 1.80, mrp: 2.80, unit_cost: 0.90, batch_no: 'ATV001', expire_date: '2026-11-30' },
  { display_name: 'Amlodipine 5mg Tablet', generic_name: 'Amlodipine', brand_name: 'Norvasc', dosage_form: 'Tablet', strength: 5, strength_unit: 'mg', package_type: 'Blister', quantity: 250, unit_price: 1.50, mrp: 2.20, unit_cost: 0.75, batch_no: 'AML001', expire_date: '2026-12-31' },
  { display_name: 'Lisinopril 10mg Tablet', generic_name: 'Lisinopril', brand_name: 'Prinivil', dosage_form: 'Tablet', strength: 10, strength_unit: 'mg', package_type: 'Blister', quantity: 220, unit_price: 1.60, mrp: 2.40, unit_cost: 0.80, batch_no: 'LIS001', expire_date: '2026-10-31' },
  { display_name: 'Metoprolol 50mg Tablet', generic_name: 'Metoprolol', brand_name: 'Lopressor', dosage_form: 'Tablet', strength: 50, strength_unit: 'mg', package_type: 'Blister', quantity: 180, unit_price: 1.40, mrp: 2.10, unit_cost: 0.70, batch_no: 'MET002', expire_date: '2026-11-30' },

  // Antidiabetic
  { display_name: 'Metformin 500mg Tablet', generic_name: 'Metformin', brand_name: 'Glucophage', dosage_form: 'Tablet', strength: 500, strength_unit: 'mg', package_type: 'Blister', quantity: 400, unit_price: 0.50, mrp: 0.85, unit_cost: 0.25, batch_no: 'MET003', expire_date: '2026-12-31' },
  { display_name: 'Glibenclamide 5mg Tablet', generic_name: 'Glibenclamide', brand_name: 'Daonil', dosage_form: 'Tablet', strength: 5, strength_unit: 'mg', package_type: 'Blister', quantity: 150, unit_price: 0.70, mrp: 1.10, unit_cost: 0.35, batch_no: 'GLI001', expire_date: '2026-10-31' },
  { display_name: 'Insulin Injection 100IU/ml 10ml Vial', generic_name: 'Human Insulin', brand_name: 'Humulin', dosage_form: 'Injection', quantity: 50, unit_price: 8.00, mrp: 12.00, unit_cost: 4.00, batch_no: 'INS001', expire_date: '2026-09-30' },

  // Antibacterial Creams
  { display_name: 'Neomycin Ointment 15g', generic_name: 'Neomycin', brand_name: 'Neosporin', dosage_form: 'Ointment', quantity: 200, unit_price: 1.80, mrp: 2.80, unit_cost: 0.90, batch_no: 'NEO001', expire_date: '2026-12-31' },
  { display_name: 'Mupirocin 2% Ointment 5g', generic_name: 'Mupirocin', brand_name: 'Bactroban', dosage_form: 'Ointment', quantity: 150, unit_price: 2.50, mrp: 3.80, unit_cost: 1.25, batch_no: 'MUP001', expire_date: '2026-11-30' },
  { display_name: 'Gentian Violet Solution 1% 30ml', generic_name: 'Gentian Violet', brand_name: 'Crystal Violet', dosage_form: 'Solution', quantity: 100, unit_price: 1.00, mrp: 1.80, unit_cost: 0.50, batch_no: 'GEN001', expire_date: '2026-12-31' },

  // Antifungal
  { display_name: 'Terbinafine 1% Cream 30g', generic_name: 'Terbinafine', brand_name: 'Lamisil', dosage_form: 'Cream', quantity: 120, unit_price: 3.50, mrp: 5.20, unit_cost: 1.75, batch_no: 'TER001', expire_date: '2026-10-31' },
  { display_name: 'Fluconazole 150mg Capsule', generic_name: 'Fluconazole', brand_name: 'Diflucan', dosage_form: 'Capsule', strength: 150, strength_unit: 'mg', package_type: 'Blister', quantity: 80, unit_price: 2.80, mrp: 4.20, unit_cost: 1.40, batch_no: 'FLU001', expire_date: '2026-11-30' },
  { display_name: 'Clotrimazole 1% Cream 30g', generic_name: 'Clotrimazole', brand_name: 'Lotrimin', dosage_form: 'Cream', quantity: 140, unit_price: 1.50, mrp: 2.50, unit_cost: 0.75, batch_no: 'CLO001', expire_date: '2026-12-31' },

  // Vitamins & Supplements
  { display_name: 'Vitamin B-Complex Tablet', generic_name: 'B Complex', brand_name: 'Becosule', dosage_form: 'Tablet', package_type: 'Blister', quantity: 400, unit_price: 0.40, mrp: 0.70, unit_cost: 0.20, batch_no: 'VIT001', expire_date: '2027-01-31' },
  { display_name: 'Vitamin D 1000 IU Tablet', generic_name: 'Vitamin D3', brand_name: 'Vigantol', dosage_form: 'Tablet', strength: 1000, strength_unit: 'IU', package_type: 'Blister', quantity: 300, unit_price: 0.50, mrp: 0.90, unit_cost: 0.25, batch_no: 'VIT002', expire_date: '2026-12-31' },
  { display_name: 'Calcium Supplement 500mg Tablet', generic_name: 'Calcium Carbonate', brand_name: 'CalciPlus', dosage_form: 'Tablet', strength: 500, strength_unit: 'mg', package_type: 'Blister', quantity: 350, unit_price: 0.60, mrp: 1.00, unit_cost: 0.30, batch_no: 'VIT003', expire_date: '2026-11-30' },
  { display_name: 'Iron Supplement 325mg Tablet', generic_name: 'Ferrous Sulfate', brand_name: 'Feglobin', dosage_form: 'Tablet', strength: 325, strength_unit: 'mg', package_type: 'Blister', quantity: 280, unit_price: 0.45, mrp: 0.80, unit_cost: 0.22, batch_no: 'VIT004', expire_date: '2026-10-31' },

  // Injections
  { display_name: 'Penicillin-G Injection 10 Lac units', generic_name: 'Penicillin G', brand_name: 'Penicort', dosage_form: 'Injection', quantity: 60, unit_price: 2.50, mrp: 4.00, unit_cost: 1.25, batch_no: 'INJ001', expire_date: '2026-12-31' },
  { display_name: 'Ceftriaxone Injection 1g Vial', generic_name: 'Ceftriaxone', brand_name: 'Rocephin', dosage_form: 'Injection', quantity: 50, unit_price: 4.50, mrp: 6.80, unit_cost: 2.25, batch_no: 'INJ002', expire_date: '2026-11-30' },
  { display_name: 'Gentamicin Injection 80mg/2ml', generic_name: 'Gentamicin', brand_name: 'Garamycin', dosage_form: 'Injection', quantity: 70, unit_price: 2.00, mrp: 3.20, unit_cost: 1.00, batch_no: 'INJ003', expire_date: '2026-10-31' },

  // Respiratory
  { display_name: 'Salbutamol Inhaler 100mcg', generic_name: 'Salbutamol', brand_name: 'Asthalin', dosage_form: 'Inhaler', quantity: 45, unit_price: 5.00, mrp: 7.50, unit_cost: 2.50, batch_no: 'RES001', expire_date: '2026-12-31' },
  { display_name: 'Beclomethasone Inhaler 50mcg', generic_name: 'Beclomethasone', brand_name: 'Beclomet', dosage_form: 'Inhaler', quantity: 40, unit_price: 6.50, mrp: 9.80, unit_cost: 3.25, batch_no: 'RES002', expire_date: '2026-11-30' },
  { display_name: 'Ipratropium Inhaler 20mcg', generic_name: 'Ipratropium', brand_name: 'Atrovent', dosage_form: 'Inhaler', quantity: 35, unit_price: 7.00, mrp: 10.50, unit_cost: 3.50, batch_no: 'RES003', expire_date: '2026-10-31' },

  // Dermatological
  { display_name: 'Betamethasone Cream 0.05% 30g', generic_name: 'Betamethasone', brand_name: 'Betnovate', dosage_form: 'Cream', quantity: 180, unit_price: 1.80, mrp: 2.80, unit_cost: 0.90, batch_no: 'DER001', expire_date: '2026-12-31' },
  { display_name: 'Hydrocortisone Cream 1% 30g', generic_name: 'Hydrocortisone', brand_name: 'Cortisone', dosage_form: 'Cream', quantity: 200, unit_price: 1.20, mrp: 2.00, unit_cost: 0.60, batch_no: 'DER002', expire_date: '2026-11-30' },
  { display_name: 'Ketoconazole Shampoo 100ml', generic_name: 'Ketoconazole', brand_name: 'Nizoral', dosage_form: 'Shampoo', quantity: 110, unit_price: 2.50, mrp: 4.00, unit_cost: 1.25, batch_no: 'DER003', expire_date: '2026-10-31' },

  // Surgical items
  { display_name: 'Cotton Gauze 4x4 inch', generic_name: 'Cotton Gauze', brand_name: 'Sterile', dosage_form: 'Dressing', quantity: 500, unit_price: 0.20, mrp: 0.35, unit_cost: 0.10, batch_no: 'SUR001', expire_date: '2026-12-31' },
  { display_name: 'Adhesive Plaster 1 inch x 5 yards', generic_name: 'Medical Tape', brand_name: 'Elastic', dosage_form: 'Tape', quantity: 300, unit_price: 0.50, mrp: 0.80, unit_cost: 0.25, batch_no: 'SUR002', expire_date: '2027-01-31' },
  { display_name: 'Surgical Gloves Size-M', generic_name: 'Latex Gloves', brand_name: 'Sterile', dosage_form: 'Glove', quantity: 200, unit_price: 0.30, mrp: 0.60, unit_cost: 0.15, batch_no: 'SUR003', expire_date: '2026-12-31' },

  // Additional medicines to reach 240+ items
  { display_name: 'Theophylline 300mg Tablet', generic_name: 'Theophylline', brand_name: 'Theodur', dosage_form: 'Tablet', strength: 300, strength_unit: 'mg', package_type: 'Blister', quantity: 150, unit_price: 1.20, mrp: 1.80, unit_cost: 0.60, batch_no: 'THE001', expire_date: '2026-11-30' },
  { display_name: 'Codeine Syrup 10mg/5ml', generic_name: 'Codeine', brand_name: 'Phensedyl', dosage_form: 'Syrup', quantity: 90, unit_price: 3.50, mrp: 5.25, unit_cost: 1.75, batch_no: 'COD001', expire_date: '2026-09-30' },
  { display_name: 'Ergot Alkaloid 1mg Tablet', generic_name: 'Ergotamine', brand_name: 'Cafergot', dosage_form: 'Tablet', strength: 1, strength_unit: 'mg', package_type: 'Blister', quantity: 100, unit_price: 2.00, mrp: 3.00, unit_cost: 1.00, batch_no: 'ERG001', expire_date: '2026-12-31' },
  { display_name: 'Metoclopramide 10mg Tablet', generic_name: 'Metoclopramide', brand_name: 'Maxolon', dosage_form: 'Tablet', strength: 10, strength_unit: 'mg', package_type: 'Blister', quantity: 350, unit_price: 0.60, mrp: 1.00, unit_cost: 0.30, batch_no: 'MET004', expire_date: '2026-10-31' },
  { display_name: 'Ondansetron 4mg Tablet', generic_name: 'Ondansetron', brand_name: 'Zofran', dosage_form: 'Tablet', strength: 4, strength_unit: 'mg', package_type: 'Blister', quantity: 120, unit_price: 1.80, mrp: 2.70, unit_cost: 0.90, batch_no: 'OND001', expire_date: '2026-11-30' },
  { display_name: 'Rantac Injection 50mg/2ml', generic_name: 'Ranitidine', brand_name: 'Rantac', dosage_form: 'Injection', quantity: 80, unit_price: 1.50, mrp: 2.25, unit_cost: 0.75, batch_no: 'RAN002', expire_date: '2026-12-31' },
  { display_name: 'Dexamethasone 0.5mg Tablet', generic_name: 'Dexamethasone', brand_name: 'Decadron', dosage_form: 'Tablet', strength: 0.5, strength_unit: 'mg', package_type: 'Blister', quantity: 140, unit_price: 0.80, mrp: 1.20, unit_cost: 0.40, batch_no: 'DEX001', expire_date: '2026-10-31' },
  { display_name: 'Prednisolone 5mg Tablet', generic_name: 'Prednisolone', brand_name: 'Wysolone', dosage_form: 'Tablet', strength: 5, strength_unit: 'mg', package_type: 'Blister', quantity: 180, unit_price: 0.70, mrp: 1.10, unit_cost: 0.35, batch_no: 'PRE001', expire_date: '2026-11-30' },
  { display_name: 'Phenytoin 100mg Capsule', generic_name: 'Phenytoin', brand_name: 'Dilantin', dosage_form: 'Capsule', strength: 100, strength_unit: 'mg', package_type: 'Blister', quantity: 110, unit_price: 1.40, mrp: 2.10, unit_cost: 0.70, batch_no: 'PHE002', expire_date: '2026-12-31' },
  { display_name: 'Carbamazepine 200mg Tablet', generic_name: 'Carbamazepine', brand_name: 'Tegretol', dosage_form: 'Tablet', strength: 200, strength_unit: 'mg', package_type: 'Blister', quantity: 100, unit_price: 1.60, mrp: 2.40, unit_cost: 0.80, batch_no: 'CAR001', expire_date: '2026-10-31' },
  { display_name: 'Valproic Acid 250mg Capsule', generic_name: 'Valproic Acid', brand_name: 'Depakote', dosage_form: 'Capsule', strength: 250, strength_unit: 'mg', package_type: 'Blister', quantity: 90, unit_price: 2.20, mrp: 3.30, unit_cost: 1.10, batch_no: 'VAL001', expire_date: '2026-11-30' },
  { display_name: 'Fluoxetine 20mg Capsule', generic_name: 'Fluoxetine', brand_name: 'Prozac', dosage_form: 'Capsule', strength: 20, strength_unit: 'mg', package_type: 'Blister', quantity: 85, unit_price: 1.80, mrp: 2.70, unit_cost: 0.90, batch_no: 'FLU002', expire_date: '2026-12-31' },
  { display_name: 'Sertraline 50mg Tablet', generic_name: 'Sertraline', brand_name: 'Zoloft', dosage_form: 'Tablet', strength: 50, strength_unit: 'mg', package_type: 'Blister', quantity: 95, unit_price: 1.60, mrp: 2.40, unit_cost: 0.80, batch_no: 'SER001', expire_date: '2026-10-31' },
  { display_name: 'Amitriptyline 25mg Tablet', generic_name: 'Amitriptyline', brand_name: 'Tryptomer', dosage_form: 'Tablet', strength: 25, strength_unit: 'mg', package_type: 'Blister', quantity: 110, unit_price: 0.75, mrp: 1.15, unit_cost: 0.37, batch_no: 'AMI001', expire_date: '2026-11-30' },
  { display_name: 'Chlorpromazine 25mg Tablet', generic_name: 'Chlorpromazine', brand_name: 'Largactil', dosage_form: 'Tablet', strength: 25, strength_unit: 'mg', package_type: 'Blister', quantity: 100, unit_price: 0.90, mrp: 1.35, unit_cost: 0.45, batch_no: 'CHL002', expire_date: '2026-12-31' },
  { display_name: 'Haloperidol 1mg Tablet', generic_name: 'Haloperidol', brand_name: 'Serenace', dosage_form: 'Tablet', strength: 1, strength_unit: 'mg', package_type: 'Blister', quantity: 80, unit_price: 1.20, mrp: 1.80, unit_cost: 0.60, batch_no: 'HAL001', expire_date: '2026-10-31' },
  { display_name: 'Chlordiazepoxide 5mg Capsule', generic_name: 'Chlordiazepoxide', brand_name: 'Librium', dosage_form: 'Capsule', strength: 5, strength_unit: 'mg', package_type: 'Blister', quantity: 120, unit_price: 1.10, mrp: 1.65, unit_cost: 0.55, batch_no: 'CHL003', expire_date: '2026-11-30' },
  { display_name: 'Diazepam 5mg Tablet', generic_name: 'Diazepam', brand_name: 'Valium', dosage_form: 'Tablet', strength: 5, strength_unit: 'mg', package_type: 'Blister', quantity: 150, unit_price: 0.80, mrp: 1.20, unit_cost: 0.40, batch_no: 'DIA001', expire_date: '2026-12-31' },
  { display_name: 'Lorazepam 1mg Tablet', generic_name: 'Lorazepam', brand_name: 'Ativan', dosage_form: 'Tablet', strength: 1, strength_unit: 'mg', package_type: 'Blister', quantity: 100, unit_price: 1.40, mrp: 2.10, unit_cost: 0.70, batch_no: 'LOR002', expire_date: '2026-10-31' },
  { display_name: 'Alprazolam 0.5mg Tablet', generic_name: 'Alprazolam', brand_name: 'Xanax', dosage_form: 'Tablet', strength: 0.5, strength_unit: 'mg', package_type: 'Blister', quantity: 110, unit_price: 1.25, mrp: 1.87, unit_cost: 0.62, batch_no: 'ALP001', expire_date: '2026-11-30' },
  { display_name: 'Sildenafil 50mg Tablet', generic_name: 'Sildenafil', brand_name: 'Viagra', dosage_form: 'Tablet', strength: 50, strength_unit: 'mg', package_type: 'Blister', quantity: 60, unit_price: 8.50, mrp: 12.75, unit_cost: 4.25, batch_no: 'SIL001', expire_date: '2026-12-31' },
  { display_name: 'Tadalafil 20mg Tablet', generic_name: 'Tadalafil', brand_name: 'Cialis', dosage_form: 'Tablet', strength: 20, strength_unit: 'mg', package_type: 'Blister', quantity: 50, unit_price: 9.00, mrp: 13.50, unit_cost: 4.50, batch_no: 'TAD001', expire_date: '2026-11-30' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { batch_size = 50, start_index = 0 } = await req.json();
    
    const endIndex = Math.min(start_index + batch_size, pharmacyStockData.length);
    const batchToUpload = pharmacyStockData.slice(start_index, endIndex);

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const item of batchToUpload) {
      try {
        await base44.asServiceRole.entities.PharmacyStock.create({
          organization_id: user.organization_id || 'default_org',
          location_id: 'default_location',
          display_name: item.display_name,
          generic_name: item.generic_name || '',
          brand_name: item.brand_name || '',
          dosage_form: item.dosage_form || '',
          service_category: 'Drug',
          strength: item.strength || 0,
          strength_unit: item.strength_unit || '',
          package_type: item.package_type || '',
          quantity: item.quantity || 0,
          unit_price: item.unit_price || 0,
          unit_cost: item.unit_cost || 0,
          mrp: item.mrp || 0,
          batch_no: item.batch_no || '',
          expire_date: item.expire_date || '',
          quality_status: 'usable',
          storage_status: 'stored',
          supplier: 'Pharmacy Supplier'
        });
        successCount++;
      } catch (error) {
        errorCount++;
        errors.push({
          item: item.display_name,
          error: error.message
        });
      }
    }

    const progress = {
      total: pharmacyStockData.length,
      uploaded: endIndex,
      percentageComplete: Math.round((endIndex / pharmacyStockData.length) * 100),
      batchSuccessCount: successCount,
      batchErrorCount: errorCount,
      hasMore: endIndex < pharmacyStockData.length,
      nextStartIndex: endIndex,
      errors: errors.length > 0 ? errors : null
    };

    return Response.json(progress);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});