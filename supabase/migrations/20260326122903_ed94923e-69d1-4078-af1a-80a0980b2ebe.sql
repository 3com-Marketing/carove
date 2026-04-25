
-- Close sessions with calculated reconciliation data
-- Session 1: Correcta (opening 300, cash_in 605, cash_out 88 → expected 817, counted 817)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-07 18:00:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Laura',
  cash_income = 605, cash_expense = 88, expected_balance = 817, counted_balance = 817, difference = 0,
  total_tpv = 4500, tpv_terminal_total = 4500, tpv_difference = 0,
  requires_review = false, review_status = 'validada', tpv_status = 'correcto', general_review_status = 'validada',
  settlement_status = 'liquidada', closing_notes = 'Cierre sin incidencias'
WHERE id = 'a0000001-0000-0000-0000-000000000001';

-- Session 2: Sobrante +5€ (opening 250, cash_in 1400, cash_out 60 → expected 1590, counted 1595)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-08 18:30:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Sergio',
  cash_income = 1400, cash_expense = 60, expected_balance = 1590, counted_balance = 1595, difference = 5,
  total_tpv = 13250, tpv_terminal_total = 13250, tpv_difference = 0,
  requires_review = true, review_status = 'revisada', tpv_status = 'correcto', general_review_status = 'revisada',
  discrepancy_reason = 'error_conteo', discrepancy_comment = 'Posible error al dar cambio durante la mañana. Sobrante de 5€.',
  settlement_status = 'liquidada', closing_notes = 'Sobrante menor, revisado por administración'
WHERE id = 'a0000001-0000-0000-0000-000000000002';

-- Session 3: Faltante -20€ (opening 350, cash_in 520, cash_out 110 → expected 760, counted 740)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-09 18:15:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Marta',
  cash_income = 520, cash_expense = 110, expected_balance = 760, counted_balance = 740, difference = -20,
  total_tpv = 6289, tpv_terminal_total = 6289, tpv_difference = 0,
  requires_review = true, review_status = 'revisada', tpv_status = 'correcto', general_review_status = 'revisada',
  discrepancy_reason = 'gasto_no_registrado', discrepancy_comment = 'Se pagó un café para un cliente y no se registró el gasto.',
  settlement_status = 'liquidada', closing_notes = 'Faltante justificado'
WHERE id = 'a0000001-0000-0000-0000-000000000003';

-- Session 4: Correcta (opening 280, cash_in 30, cash_out 40 → expected 270, counted 270)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-10 17:00:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Iván',
  cash_income = 30, cash_expense = 40, expected_balance = 270, counted_balance = 270, difference = 0,
  total_tpv = 22, tpv_terminal_total = 22, tpv_difference = 0,
  requires_review = false, review_status = 'validada', tpv_status = 'correcto', general_review_status = 'validada',
  settlement_status = 'liquidada', closing_notes = 'Día tranquilo, sin incidencias'
WHERE id = 'a0000001-0000-0000-0000-000000000004';

-- Session 5: Correcta (opening 320, cash_in 1300, cash_out 165 → expected 1455, counted 1455)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-11 18:00:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Paula',
  cash_income = 1300, cash_expense = 165, expected_balance = 1455, counted_balance = 1455, difference = 0,
  total_tpv = 32540, tpv_terminal_total = 32540, tpv_difference = 0,
  requires_review = false, review_status = 'validada', tpv_status = 'correcto', general_review_status = 'validada',
  settlement_status = 'liquidada', closing_notes = 'Gran día de ventas, todo cuadrado'
WHERE id = 'a0000001-0000-0000-0000-000000000005';

-- Session 6: EJEMPLAR - Correcta (opening 400, cash_in 1905, cash_out 337 → expected 1968, counted 1968)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-14 18:30:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Laura',
  cash_income = 1905, cash_expense = 337, expected_balance = 1968, counted_balance = 1968, difference = 0,
  total_tpv = 30200, tpv_terminal_total = 30200, tpv_difference = 0,
  requires_review = false, review_status = 'validada', tpv_status = 'correcto', general_review_status = 'validada',
  settlement_status = 'liquidada', closing_notes = 'Sesión ejemplar: alto volumen, cuadre perfecto en efectivo y TPV'
WHERE id = 'a0000001-0000-0000-0000-000000000006';

-- Session 7: Sobrante +3€ (opening 200, cash_in 250, cash_out 23 → expected 427, counted 430)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-15 17:30:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Sergio',
  cash_income = 250, cash_expense = 23, expected_balance = 427, counted_balance = 430, difference = 3,
  total_tpv = 18, tpv_terminal_total = 18, tpv_difference = 0,
  requires_review = true, review_status = 'revisada', tpv_status = 'correcto', general_review_status = 'revisada',
  discrepancy_reason = 'ingreso_no_registrado', discrepancy_comment = 'Probablemente un cliente dejó propina que no se registró.',
  settlement_status = 'liquidada', closing_notes = 'Sobrante mínimo'
WHERE id = 'a0000001-0000-0000-0000-000000000007';

-- Session 8: Correcta (opening 350, cash_in 512, cash_out 135 → expected 727, counted 727)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-16 18:00:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Marta',
  cash_income = 512, cash_expense = 135, expected_balance = 727, counted_balance = 727, difference = 0,
  total_tpv = 13850, tpv_terminal_total = 13850, tpv_difference = 0,
  requires_review = false, review_status = 'validada', tpv_status = 'correcto', general_review_status = 'validada',
  settlement_status = 'liquidada', closing_notes = 'Cierre correcto'
WHERE id = 'a0000001-0000-0000-0000-000000000008';

-- Session 9: Faltante -15€ + descuadre TPV -25€ (opening 300, cash_in 385, cash_out 50 → expected 635, counted 620)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-17 18:00:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Iván',
  cash_income = 385, cash_expense = 50, expected_balance = 635, counted_balance = 620, difference = -15,
  total_tpv = 6025, tpv_terminal_total = 6000, tpv_difference = -25,
  requires_review = true, review_status = 'revisada', tpv_status = 'descuadre', general_review_status = 'revisada',
  discrepancy_reason = 'error_cambio', discrepancy_comment = 'Error al dar cambio de un billete de 50€.',
  tpv_discrepancy_reason = 'operacion_no_registrada', tpv_discrepancy_comment = 'Una operación TPV de 25€ aparece en el terminal pero no se registró en el sistema.',
  settlement_status = 'liquidada', closing_notes = 'Descuadre doble: efectivo y TPV. Revisado y justificado.'
WHERE id = 'a0000001-0000-0000-0000-000000000009';

-- Session 10: Efectivo correcto, descuadre TPV (opening 280, cash_in 628, cash_out 90 → expected 818, counted 818)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-18 18:15:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Paula',
  cash_income = 628, cash_expense = 90, expected_balance = 818, counted_balance = 818, difference = 0,
  total_tpv = 24560, tpv_terminal_total = 24520, tpv_difference = -40,
  requires_review = false, review_status = 'validada', tpv_status = 'descuadre', general_review_status = 'pendiente',
  tpv_discrepancy_reason = 'importe_incorrecto', tpv_discrepancy_comment = 'El terminal reporta 40€ menos que el sistema. Pendiente de verificar con el banco.',
  settlement_status = 'liquidada', closing_notes = 'Efectivo perfecto, descuadre TPV pendiente de aclarar con entidad bancaria'
WHERE id = 'a0000001-0000-0000-0000-000000000010';

-- Session 11: Sobrante +10€ (opening 500, cash_in 22895, cash_out 315 → expected 23080, counted 23090)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-21 18:30:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Laura',
  cash_income = 22895, cash_expense = 315, expected_balance = 23080, counted_balance = 23090, difference = 10,
  total_tpv = 8150, tpv_terminal_total = 8150, tpv_difference = 0,
  requires_review = true, review_status = 'revisada', tpv_status = 'correcto', general_review_status = 'revisada',
  discrepancy_reason = 'error_conteo', discrepancy_comment = 'Sobrante de 10€. Posiblemente un redondeo en pago en efectivo del Peugeot.',
  settlement_status = 'liquidada', closing_notes = 'Día excepcional con pago en efectivo de 21.500€'
WHERE id = 'a0000001-0000-0000-0000-000000000011';

-- Session 12: Faltante importante -50€ (opening 220, cash_in 530, cash_out 57 → expected 693, counted 643)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-22 18:00:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Sergio',
  cash_income = 530, cash_expense = 57, expected_balance = 693, counted_balance = 643, difference = -50,
  total_tpv = 9535, tpv_terminal_total = 9535, tpv_difference = 0,
  requires_review = true, review_status = 'pendiente', tpv_status = 'correcto', general_review_status = 'pendiente',
  discrepancy_reason = 'otro', discrepancy_comment = 'Faltan 50€ sin explicación clara. Pendiente de revisión por administración.',
  settlement_status = 'pendiente', closing_notes = 'Faltante significativo sin justificar. Requiere investigación.'
WHERE id = 'a0000001-0000-0000-0000-000000000012';

-- Session 14: Faltante -8€, pendiente revisión (opening 250, cash_in 400, cash_out 147 → expected 503, counted 495)
UPDATE cash_sessions SET
  status = 'cerrada', closed_at = '2026-03-23 18:00:00', closed_by = 'd1073b29-f873-49bb-bece-30304bb24865', closed_by_name = 'Paula',
  cash_income = 400, cash_expense = 147, expected_balance = 503, counted_balance = 495, difference = -8,
  total_tpv = 25600, tpv_terminal_total = 25600, tpv_difference = 0,
  requires_review = true, review_status = 'revisada', tpv_status = 'correcto', general_review_status = 'revisada',
  discrepancy_reason = 'gasto_no_registrado', discrepancy_comment = 'Se compró agua para la sala de espera y no se registró.',
  settlement_status = 'liquidada', closing_notes = 'Faltante menor justificado'
WHERE id = 'a0000001-0000-0000-0000-000000000014';
