import {
  BackgroundSize,
  ControlType,
  ElementType,
  IEditorOption,
  IElement,
  ListType,
  RowFlex,
  TitleLevel
} from './editor'

const text = `Chief Complaint:\nFever for three days, cough for five days.\n\nHistory of Present Illness:\nThe patient developed facial edema without obvious  cause three days  ago after catching a cold, no rash, decreased urine output, fatigue appeared, no improvement with external treatment, now comes to our hospital for consultation.\n\nPast Medical History:\nDiabetes for 10 years, hypertension for 2 years, infectious disease for 1 year. Report other past medical conditions.\nEpidemiological History:\nDenies contact with confirmed patients, suspected patients, asymptomatic carriers and their close contacts within 14 days; Denies visiting the following places within 14 days: seafood and meat wholesale markets, farmers markets, fairs, large supermarkets, night markets; Denies close contact with staff from the following places within 14 days: seafood and meat wholesale markets, farmers markets, fairs, large supermarkets; Denies 2 or more clustered cases in the surrounding area (such as home, office) within 14 days; Denies contact with people with fever or respiratory symptoms within 14 days; Denies having fever or respiratory symptoms within 14 days; Denies contact with people under isolation observation and other situations that may be associated with COVID-19 within 14 days; Accompanying family members have none of the above situations.\n\nPhysical Examination:\nT: 39.5°C, P: 80bpm, R: 20/min, BP: 120/80mmHg;\n\nAuxiliary Examination:\nJune 10, 2020, Radiology: Hematocrit 36.50% (low) 40~50; Monocyte absolute value 0.75*10/L (high) Reference value: 0.1~0.6;\n\nOutpatient Diagnosis: Treatment: Electronic Signature: []\n\nOther Records:`

// Simulate titles
const titleText = [
  'Chief Complaint:',
  'History of Present Illness:',
  'Past Medical History:',
  'Epidemiological History:',
  'Physical Examination:',
  'Auxiliary Examination:',
  'Outpatient Diagnosis:',
  'Treatment:',
  'Electronic Signature:',
  'Other Records:'
]
const titleMap: Map<number, string> = new Map()
for (let t = 0; t < titleText.length; t++) {
  const value = titleText[t]
  const i = text.indexOf(value)
  if (~i) {
    titleMap.set(i, value)
  }
}

// Simulate colored text
const colorText = ['infectious disease']
const colorIndex: number[] = colorText
  .map(b => {
    const i = text.indexOf(b)
    return ~i
      ? Array(b.length)
          .fill(i)
          .map((_, j) => i + j)
      : []
  })
  .flat()

// Simulate highlighted text
const highlightText = ['Hematocrit']
const highlightIndex: number[] = highlightText
  .map(b => {
    const i = text.indexOf(b)
    return ~i
      ? Array(b.length)
          .fill(i)
          .map((_, j) => i + j)
      : []
  })
  .flat()

const elementList: IElement[] = []
// Compose plain text data
const textList = text.split('')
let index = 0
while (index < textList.length) {
  const value = textList[index]
  const title = titleMap.get(index)
  if (title) {
    elementList.push({
      value: '',
      type: ElementType.TITLE,
      level: TitleLevel.FIRST,
      valueList: [
        {
          value: title,
          size: 18
        }
      ]
    })
    index += title.length - 1
  } else if (colorIndex.includes(index)) {
    elementList.push({
      value,
      color: '#FF0000',
      size: 16
    })
  } else if (highlightIndex.includes(index)) {
    elementList.push({
      value,
      highlight: '#F2F27F',
      groupIds: ['1'] // Simulate comment
    })
  } else {
    elementList.push({
      value,
      size: 16
    })
  }
  index++
}

// Simulate text control
elementList.splice(12, 0, {
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: '1',
    type: ControlType.TEXT,
    value: null,
    placeholder: 'Additional notes',
    prefix: '{',
    postfix: '}'
  }
})

// Add space after text control
elementList.splice(13, 0, {
  value: ' ',
  size: 16
})

// Simulate dropdown control
elementList.splice(101, 0, {
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: '2',
    type: ControlType.SELECT,
    value: null,
    code: null,
    placeholder: 'Yes/No',
    prefix: '{',
    postfix: '}',
    valueSets: [
      {
        value: 'Yes',
        code: '98175'
      },
      {
        value: 'No',
        code: '98176'
      },
      {
        value: 'Unknown',
        code: '98177'
      }
    ]
  }
})

// Simulate hyperlink
elementList.splice(120, 0, {
  type: ElementType.HYPERLINK,
  value: '',
  valueList: [
    {
      value: 'C',
      size: 16
    },
    {
      value: 'O',
      size: 16
    },
    {
      value: 'V',
      size: 16
    },
    {
      value: 'I',
      size: 16
    },
    {
      value: 'D',
      size: 16
    }
  ],
  url: 'http://localhost:3000/canvas-editor'
})

// Simulate text control (with pre/post text)
elementList.splice(334, 0, {
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: '6',
    type: ControlType.TEXT,
    value: null,
    placeholder: 'content',
    preText: 'Other: ',
    postText: '.'
  }
})

// Simulate subscript
elementList.splice(347, 0, {
  value: '∆',
  color: '#FF0000',
  type: ElementType.SUBSCRIPT
})

// Simulate list
elementList.splice(405, 0, {
  value: '',
  type: ElementType.LIST,
  listType: ListType.OL,
  valueList: [
    {
      value: 'Hypertension\nDiabetes\nViral Cold\nAllergic Rhinitis\nAllergic'
    }
  ]
})

elementList.splice(406, 0, {
  value: '',
  type: ElementType.LIST,
  listType: ListType.OL,
  valueList: [
    {
      value:
        'Ultrasound-guided thyroid fine needle aspiration;\nHepatitis B surface antibody test;\nMembrane lesion cell collection, posterior neck subcutaneous layer;'
    }
  ]
})

// Simulate superscript
elementList.splice(1402, 0, {
  value: '9',
  type: ElementType.SUPERSCRIPT
})

elementList.push({value: "\n"})
// // Simulate image
// elementList.splice(456, 0, {
//   value: `data:image/png;base64,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`,
//   width: 89,
//   height: 32,
//   id: 'signature',
//   type: ElementType.IMAGE
// })

// Simulate table
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    {
      width: 180
    },
    {
      width: 80
    },
    {
      width: 130
    },
    {
      width: 130
    }
  ],
  trList: [
    {
      height: 40,
      tdList: [
        {
          colspan: 1,
          rowspan: 2,
          value: [
            { value: `1`, size: 16 },
            { value: '.', size: 16 }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `2`, size: 16 },
            { value: '.', size: 16 }
          ]
        },
        {
          colspan: 2,
          rowspan: 1,
          value: [
            { value: `3`, size: 16 },
            { value: '.', size: 16 }
          ]
        }
      ]
    },
    {
      height: 40,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `4`, size: 16 },
            { value: '.', size: 16 }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `5`, size: 16 },
            { value: '.', size: 16 }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `6`, size: 16 },
            { value: '.', size: 16 }
          ]
        }
      ]
    },
    {
      height: 40,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `7`, size: 16 },
            { value: '.', size: 16 }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `8`, size: 16 },
            { value: '.', size: 16 }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `9`, size: 16 },
            { value: '.', size: 16 }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { value: `1`, size: 16 },
            { value: `0`, size: 16 },
            { value: '.', size: 16 }
          ]
        }
      ]
    }
  ]
})

// Simulate checkbox
elementList.push(
  ...(<IElement[]>[
    {
      value: 'Do you agree with the above content: '
    },
    {
      type: ElementType.CONTROL,
      control: {
        conceptId: '3',
        type: ControlType.CHECKBOX,
        code: '98175',
        value: '',
        valueSets: [
          {
            value: 'Agree',
            code: '98175'
          },
          {
            value: 'Disagree',
            code: '98176'
          }
        ]
      },
      value: ''
    },
    {
      value: '\n'
    }
  ])
)

// LaTeX formula
elementList.push(
  ...(<IElement[]>[
    {
      value: 'Medical formula: '
    },
    {
      value: `{E_k} = hv - {W_0}`,
      type: ElementType.LATEX
    },
    {
      value: '\n'
    }
  ])
)

// Date picker
elementList.push(
  ...(<IElement[]>[
    {
      value: 'Signing Date: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '5',
        type: ControlType.DATE,
        value: [
          {
            value: `2022-08-10 17:30:01`
          }
        ],
        placeholder: 'Signing Date'
      }
    },
    {
      value: '\n'
    }
  ])
)

// Simulate Label tag
elementList.push(
  ...(<IElement[]>[
    {
      value: 'Diagnosis Label: '
    },
    {
      type: ElementType.LABEL,
      value: 'Hypertension',
      labelId: 'l1',
      size: 14
    },
    {
      value: '\n'
    }
  ])
)

// 模拟固定长度下划线
elementList.push(
  ...[
    {
      value: 'Patient Signature: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '4',
        type: ControlType.TEXT,
        value: null,
        placeholder: '',
        prefix: '\u200c',
        postfix: '\u200c',
        minWidth: 160,
        underline: true
      }
    }
  ]
)
elementList.push(
  ...(<IElement[]>[
    {
      value: '\nVisit Count: '
    },
    {
      type: ElementType.CONTROL,
      value: '',
      control: {
        conceptId: '7',
        type: ControlType.TEXT,
        value: null,
        placeholder: 'Visit Count',
        prefix: '{',
        postfix: '}'
      }
    }
  ])
)

// 模拟结尾文本
elementList.push(
  ...[
    {
      value: '\n'
    }
  ]
)

// Arabic text sample (uses ShapeEngine fallback — no explicit font needed)
const arabicTitle = 'الملاحظات السريرية:'
const arabicBody =
  'يعاني المريض من حمى منذ ثلاثة أيام مع سعال جاف. الفحص السريري يظهر احمرار في الحلق مع تضخم في اللوزتين.'
const arabicChars = `${arabicTitle}\n${arabicBody}`.split('')
for (let i = 0; i < arabicChars.length; i++) {
  const isTitle = i < arabicTitle.length
  if (isTitle && i === 0) {
    elementList.push({
      value: '',
      type: ElementType.TITLE,
      level: TitleLevel.FIRST,
      valueList: [
        {
          value: arabicTitle,
          size: 18
        }
      ]
    })
    i += arabicTitle.length // skip title chars (includes \n)
  }
  if (i < arabicChars.length) {
    elementList.push({
      value: arabicChars[i],
      size: 16
    })
  }
}

// Mixed script sample: English + Arabic in same paragraph
elementList.push(
  { value: '\n' },
  { value: 'M', size: 16 },
  { value: 'i', size: 16 },
  { value: 'x', size: 16 },
  { value: 'e', size: 16 },
  { value: 'd', size: 16 },
  { value: ':', size: 16 },
  { value: ' ', size: 16 },
  { value: 'م', size: 16 },
  { value: 'ر', size: 16 },
  { value: 'ح', size: 16 },
  { value: 'ب', size: 16 },
  { value: 'ا', size: 16 },
  { value: ' ', size: 16 },
  { value: 'H', size: 16 },
  { value: 'e', size: 16 },
  { value: 'l', size: 16 },
  { value: 'l', size: 16 },
  { value: 'o', size: 16 }
)

// BiDi test: English sentence with Arabic name (LTR paragraph)
const bidiTest1 = 'The patient محمد أحمد visited the clinic today.'
const bidiChars1 = bidiTest1.split('')
elementList.push({ value: '\n' })
for (const ch of bidiChars1) {
  elementList.push({ value: ch, size: 16 })
}

// BiDi test: Arabic sentence with English term (RTL paragraph)
const bidiTest2 = 'تم تشخيص المريض بـ COVID-19 في المستشفى.'
const bidiChars2 = bidiTest2.split('')
elementList.push({ value: '\n' })
for (const ch of bidiChars2) {
  elementList.push({ value: ch, size: 16 })
}

// ─── Arabic / BiDi extended test scenarios ───────────────────────────

// 1. Arabic ordered list (tests RTL marker format: .1 .2 .3)
elementList.push({ value: '\n' })
elementList.push({
  value: '',
  type: ElementType.LIST,
  listType: ListType.OL,
  valueList: [
    {
      value: 'فحص الدم الكامل\nتحليل البول\nأشعة سينية للصدر\nتخطيط القلب الكهربائي\nفحص وظائف الكبد'
    }
  ]
})

// 2. Arabic unordered list (tests bullet positioning in RTL)
elementList.push({ value: '\n' })
elementList.push({
  value: '',
  type: ElementType.LIST,
  listType: ListType.UL,
  valueList: [
    {
      value: 'صداع مستمر\nدوخة متكررة\nألم في المفاصل\nضيق في التنفس'
    }
  ]
})

// 3. Mixed Arabic + English ordered list (tests BiDi inside list items)
elementList.push({ value: '\n' })
elementList.push({
  value: '',
  type: ElementType.LIST,
  listType: ListType.OL,
  valueList: [
    {
      value: 'Paracetamol باراسيتامول 500mg\nAmoxicillin أموكسيسيلين 250mg\nIbuprofen إيبوبروفين 400mg'
    }
  ]
})

// 4. Arabic paragraph with embedded numbers and punctuation
const arabicWithNumbers = 'رقم الملف الطبي: 2024-03-1578، عمر المريض: 45 سنة، رقم الهاتف: +966-50-123-4567. تاريخ الزيارة: 15/02/2026.'
elementList.push({ value: '\n' }, { value: '\n' })
for (const ch of arabicWithNumbers.split('')) {
  elementList.push({ value: ch, size: 16 })
}

// 5. Arabic bold/italic paragraph (tests styled RTL text)
const arabicStyled = 'التشخيص النهائي'
elementList.push({ value: '\n' }, { value: '\n' })
for (const ch of arabicStyled.split('')) {
  elementList.push({ value: ch, size: 18, bold: true })
}
const arabicStyledBody = ' — التهاب اللوزتين الحاد مع '
for (const ch of arabicStyledBody.split('')) {
  elementList.push({ value: ch, size: 16 })
}
const arabicItalic = 'حمى روماتيزمية'
for (const ch of arabicItalic.split('')) {
  elementList.push({ value: ch, size: 16, italic: true })
}

// 6. BiDi: Arabic paragraph with multiple English terms (heavy switching)
const bidiHeavy = 'يجب إجراء فحص CBC و ESR و CRP بالإضافة إلى X-Ray للصدر وفحص PCR خلال 24 ساعة.'
elementList.push({ value: '\n' }, { value: '\n' })
for (const ch of bidiHeavy.split('')) {
  elementList.push({ value: ch, size: 16 })
}

// 7. BiDi: English paragraph with multiple Arabic names
const bidiNames = 'Patients محمد علي, فاطمة الزهراء, and عبدالله الرشيد were admitted on the same day.'
elementList.push({ value: '\n' }, { value: '\n' })
for (const ch of bidiNames.split('')) {
  elementList.push({ value: ch, size: 16 })
}

// 8. Pure Arabic multi-line paragraph (tests line wrapping in RTL)
const arabicLong = 'أجرى الطبيب المعالج فحصاً شاملاً للمريض وتبين وجود التهاب حاد في الجهاز التنفسي العلوي مصحوباً بارتفاع في درجة الحرارة وآلام في الجسم. تم وصف المضادات الحيوية المناسبة مع خافض للحرارة ومسكن للألم. يُنصح المريض بالراحة التامة وشرب السوائل بكثرة والمتابعة بعد أسبوع.'
elementList.push({ value: '\n' }, { value: '\n' })
for (const ch of arabicLong.split('')) {
  elementList.push({ value: ch, size: 16 })
}

// 9. Arabic with highlighted and colored text
const arabicHighlight = 'نتائج التحليل: '
elementList.push({ value: '\n' }, { value: '\n' })
for (const ch of arabicHighlight.split('')) {
  elementList.push({ value: ch, size: 16 })
}
const arabicAbnormal = 'غير طبيعي'
for (const ch of arabicAbnormal.split('')) {
  elementList.push({ value: ch, size: 16, color: '#FF0000', bold: true })
}
const arabicNormal = ' — مستوى السكر: '
for (const ch of arabicNormal.split('')) {
  elementList.push({ value: ch, size: 16 })
}
const arabicValue = 'طبيعي'
for (const ch of arabicValue.split('')) {
  elementList.push({ value: ch, size: 16, highlight: '#eeeb44' })
}

// 10. Arabic hyperlink (tests clickable RTL text)
elementList.push(
  { value: '\n' },
  { value: '\n' },
  {
    type: ElementType.HYPERLINK,
    value: '',
    valueList: 'رابط التقرير الطبي'.split('').map(ch => ({
      value: ch,
      size: 16
    })),
    url: 'http://localhost:3000/canvas-editor'
  }
)

// 11. BiDi: Parentheses and brackets (tests mirroring)
const bidiParens = 'المرجع (انظر الملحق A) والجدول [رقم 3] لمزيد من التفاصيل.'
elementList.push({ value: '\n' }, { value: '\n' })
for (const ch of bidiParens.split('')) {
  elementList.push({ value: ch, size: 16 })
}

// 12. Arabic table (tests RTL content inside table cells)
elementList.push({ value: '\n' })
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 139 },
    { width: 139 },
    { width: 138 },
    { width: 138 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'اسم المريض'.split('').map(ch => ({ value: ch, size: 14, bold: true }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'التشخيص'.split('').map(ch => ({ value: ch, size: 14, bold: true }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'الحالة'.split('').map(ch => ({ value: ch, size: 14, bold: true }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'الملاحظات'.split('').map(ch => ({ value: ch, size: 14, bold: true }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'أحمد محمد'.split('').map(ch => ({ value: ch, size: 14 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'التهاب رئوي'.split('').map(ch => ({ value: ch, size: 14 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'مستقر'.split('').map(ch => ({ value: ch, size: 14 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'متابعة بعد أسبوع'.split('').map(ch => ({ value: ch, size: 14 }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'فاطمة علي'.split('').map(ch => ({ value: ch, size: 14 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Diabetes Type 2'.split('').map(ch => ({ value: ch, size: 14 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'حرج'.split('').map(ch => ({ value: ch, size: 14, color: '#FF0000' }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'تحويل ICU'.split('').map(ch => ({ value: ch, size: 14 }))
        }
      ]
    }
  ]
})

// 13. Arabic LaTeX formula context
elementList.push(
  { value: '\n' },
  { value: '\n' },
  ...('المعادلة الطبية: '.split('').map(ch => ({ value: ch, size: 16 }))),
  {
    value: 'BMI = \\frac{m}{h^2}',
    type: ElementType.LATEX
  }
)

// 14. BiDi: Numbered list mixing Arabic digits with Hindi numerals context
const arabicDigits = 'الجرعة: ١٢٥ ملغ (125mg) ثلاث مرات يومياً لمدة ٧ أيام.'
elementList.push({ value: '\n' }, { value: '\n' })
for (const ch of arabicDigits.split('')) {
  elementList.push({ value: ch, size: 16 })
}

// 15. Short RTL lines (tests alignment of single-word RTL rows)
const shortRTL = ['مقدمة', 'الخلاصة', 'التوصيات']
elementList.push({ value: '\n' })
for (const word of shortRTL) {
  elementList.push({ value: '\n' })
  for (const ch of word.split('')) {
    elementList.push({ value: ch, size: 16, bold: true, underline: true })
  }
}

// ─── End Arabic / BiDi extended test scenarios ───────────────────────

// ─── Arabic Controls Test Scenarios ──────────────────────────────────

elementList.push({ value: '\n' })
elementList.push({ value: '\n' })
elementList.push({ value: '\n' })

for (const ch of "Input Elements (Arabic)".split('')) {
  elementList.push({
    value: ch,
    size: 20,
    bold: true,
    rowFlex: RowFlex.CENTER
  })
}
elementList.push({ value: '\n' })
// 16. Arabic select control (tests RTL popup positioning)
const selectLabel = 'الحالة الصحية: '
for (const ch of selectLabel.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: 'rtl-select-1',
    type: ControlType.SELECT,
    value: null,
    code: null,
    placeholder: 'اختر الحالة',
    prefix: '{',
    postfix: '}',
    valueSets: [
      { value: 'مستقر', code: 'stable' },
      { value: 'حرج', code: 'critical' },
      { value: 'تحت المراقبة', code: 'observation' },
      { value: 'متعافي', code: 'recovered' }
    ]
  }
})

// 17. Arabic date control (tests RTL date picker positioning)
elementList.push({ value: '\n' })
const dateLabel = 'تاريخ الدخول: '
for (const ch of dateLabel.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: 'rtl-date-1',
    type: ControlType.DATE,
    value: null,
    placeholder: 'تاريخ الدخول',
    dateFormat: 'yyyy-MM-dd',
    prefix: '{',
    postfix: '}'
  }
})

// 18. Arabic text control (tests RTL text input)
elementList.push({ value: '\n' })
const textLabel = 'اسم الطبيب: '
for (const ch of textLabel.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: 'rtl-text-1',
    type: ControlType.TEXT,
    value: null,
    placeholder: 'اسم الطبيب المعالج',
    prefix: '{',
    postfix: '}'
  }
})

// 19. Arabic checkbox control (tests RTL checkbox positioning)
elementList.push({ value: '\n' })
const checkboxLabel = 'الأعراض: '
for (const ch of checkboxLabel.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: 'rtl-checkbox-1',
    type: ControlType.CHECKBOX,
    value: null,
    code: null,
    prefix: '',
    postfix: '',
    valueSets: [
      { value: 'حمى', code: 'fever' },
      { value: 'سعال', code: 'cough' },
      { value: 'صداع', code: 'headache' },
      { value: 'إرهاق', code: 'fatigue' }
    ]
  }
})

// 20. Arabic select control — gender (tests select popup with short Arabic values)
elementList.push({ value: '\n' })
const genderLabel = 'الجنس: '
for (const ch of genderLabel.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: 'rtl-select-gender',
    type: ControlType.SELECT,
    value: null,
    code: null,
    placeholder: 'جنس',
    prefix: '{',
    postfix: '}',
    valueSets: [
      { value: 'ذكر', code: 'male' },
      { value: 'أنثى', code: 'female' }
    ]
  }
})

// 21. Arabic number control (tests RTL calculator popup)
elementList.push({ value: '\n' })
const ageLabel = 'العمر: '
for (const ch of ageLabel.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: 'rtl-number-age',
    type: ControlType.NUMBER,
    value: null,
    placeholder: 'أدخل العمر',
    prefix: '{',
    postfix: '}',
    min: 0,
    max: 150
  }
})

// 22. Arabic text control with pre-filled value
elementList.push({ value: '\n' })
const addressLabel = 'العنوان: '
for (const ch of addressLabel.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: 'rtl-text-address',
    type: ControlType.TEXT,
    value: [
      { value: 'ش' },
      { value: 'ا' },
      { value: 'ر' },
      { value: 'ع' },
      { value: ' ' },
      { value: 'ا' },
      { value: 'ل' },
      { value: 'م' },
      { value: 'ل' },
      { value: 'ك' },
      { value: ' ' },
      { value: 'ف' },
      { value: 'ه' },
      { value: 'د' }
    ],
    placeholder: 'أدخل العنوان',
    prefix: '{',
    postfix: '}'
  }
})

// 23. Arabic select with border (tests control border RTL rendering)
elementList.push({ value: '\n' })
const bloodLabel = 'فصيلة الدم: '
for (const ch of bloodLabel.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.CONTROL,
  value: '',
  control: {
    conceptId: 'rtl-select-blood',
    type: ControlType.SELECT,
    value: null,
    code: null,
    placeholder: 'اختر الفصيلة',
    valueSets: [
      { value: 'A+', code: 'a-pos' },
      { value: 'A-', code: 'a-neg' },
      { value: 'B+', code: 'b-pos' },
      { value: 'B-', code: 'b-neg' },
      { value: 'O+', code: 'o-pos' },
      { value: 'O-', code: 'o-neg' },
      { value: 'AB+', code: 'ab-pos' },
      { value: 'AB-', code: 'ab-neg' }
    ]
  }
})

// ─── End Arabic Controls Test Scenarios ──────────────────────────────

// ─── Phase C+D: Label RTL padding + PageBreak shaping gateway ────────

// 24. Arabic label (tests direction-aware padding in LabelParticle)
elementList.push({ value: '\n' })
const labelIntro = 'التشخيص: '
for (const ch of labelIntro.split('')) {
  elementList.push({ value: ch, size: 16 })
}
elementList.push({
  type: ElementType.LABEL,
  value: 'ارتفاع ضغط الدم',
  labelId: 'rtl-label-bp',
  size: 14,
  label: {
    color: '#ffffff',
    backgroundColor: '#e74c3c',
    borderRadius: 4,
    padding: [4, 2, 4, 2]
  }
})
// English label on same line for comparison
elementList.push({ value: ' ' })
elementList.push({
  type: ElementType.LABEL,
  value: 'Hypertension',
  labelId: 'ltr-label-bp',
  size: 14,
  label: {
    color: '#ffffff',
    backgroundColor: '#3498db',
    borderRadius: 4,
    padding: [4, 2, 4, 2]
  }
})

// 25. Page break (tests renderString shaping gateway in PageBreakParticle)
// elementList.push({ value: '\n' })
// elementList.push({
//   type: ElementType.PAGE_BREAK,
//   value: '\n'
// })

// ─── End Phase C+D Test Scenarios ────────────────────────────────────

// ─── Bilingual Contract Table (English / Arabic) ─────────────────────

elementList.push({ value: '\n' }, { value: '\n' })

// Contract title
const contractTitleEN = 'SERVICE AGREEMENT'
for (const ch of contractTitleEN.split('')) {
  elementList.push({
    value: ch,
    size: 20,
    bold: true,
    rowFlex: RowFlex.CENTER
  })
}
elementList.push({ value: '\n' })
const contractTitleAR = 'اتفاقية الخدمات'
for (const ch of contractTitleAR.split('')) {
  elementList.push({
    value: ch,
    size: 20,
    bold: true,
    rowFlex: RowFlex.CENTER
  })
}
elementList.push({ value: '\n' })

// Contract table: English clause (left) | Arabic clause (right)
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 277 },
    { width: 277 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'English Clause'.split('').map(ch => ({
            value: ch, size: 14, bold: true
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'البند بالعربية'.split('').map(ch => ({
            value: ch, size: 14, bold: true
          }))
        }
      ]
    },
    {
      height: 50,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'Article 1: The Service Provider agrees to deliver the services described in Annex A within 30 days of contract execution.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'المادة الأولى: يوافق مزود الخدمة على تقديم الخدمات الموصوفة في الملحق أ خلال ثلاثين يوماً من تاريخ توقيع العقد.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    },
    {
      height: 50,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'Article 2: Payment shall be made in two installments — 50% upon signing and 50% upon completion of deliverables.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'المادة الثانية: يتم الدفع على دفعتين — خمسون بالمئة عند التوقيع وخمسون بالمئة عند إتمام التسليمات.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    },
    {
      height: 50,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'Article 3: Either party may terminate this agreement with 15 days written notice if obligations are not met.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'المادة الثالثة: يحق لأي من الطرفين إنهاء هذه الاتفاقية بإشعار خطي مدته خمسة عشر يوماً في حال عدم الوفاء بالالتزامات.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    },
    {
      height: 50,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'Article 4: All disputes arising from this agreement shall be settled through arbitration in accordance with local regulations.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'المادة الرابعة: تُحل جميع النزاعات الناشئة عن هذه الاتفاقية عن طريق التحكيم وفقاً للأنظمة المحلية المعمول بها.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    },
    {
      height: 50,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'Article 5: Confidential information shared during the term of this agreement shall not be disclosed to any third party.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'المادة الخامسة: لا يجوز الإفصاح عن أي معلومات سرية يتم تبادلها خلال فترة سريان هذه الاتفاقية لأي طرف ثالث.'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    }
  ]
})

elementList.push({ value: '\n' })

for (const ch of "Arabic Table (RTL)".split('')) {
  elementList.push({
    value: ch,
    size: 20,
    bold: true,
    rowFlex: RowFlex.CENTER
  })
}
elementList.push({ value: '\n' })

// 24. RTL table: Arabic patient info (auto-detected direction from first cell)
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 184 },
    { width: 184 },
    { width: 184 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'التشخيص'.split('').map(ch => ({
            value: ch, size: 14, bold: true
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'تاريخ الدخول'.split('').map(ch => ({
            value: ch, size: 14, bold: true
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'اسم المريض'.split('').map(ch => ({
            value: ch, size: 14, bold: true
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'كسر في الساق'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: '٢٠٢٦/٠٢/١٥'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'أحمد محمد'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'التهاب رئوي'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: '٢٠٢٦/٠٢/١٠'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'فاطمة علي'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    }
  ]
})
elementList.push({ value: '\n' })

// 25. RTL table with explicit direction: medical report summary
elementList.push({
  type: ElementType.TABLE,
  value: '',
  direction: 'rtl' as const,
  colgroup: [
    { width: 277 },
    { width: 277 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'القيمة'.split('').map(ch => ({
            value: ch, size: 14, bold: true
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'البيان'.split('').map(ch => ({
            value: ch, size: 14, bold: true
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'أحمد بن سعيد'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'اسم المريض'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: '٣٥ سنة'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'العمر'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'A+ موجب'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'فصيلة الدم'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    }
  ]
})
elementList.push({ value: '\n' })

// ─── End Bilingual Contract Table ────────────────────────────────────


elementList.push({ value: '\n', size: 16 })
elementList.push({ value: '\n', size: 16 })

// ============================================================
// Layer System Test Cases
// These elements verify the two-canvas layer architecture:
// - Selection canvas (bottom): background, watermark, selection rects, search highlights
// - Content canvas (top): text, controls, underlines, strikeouts, float images
// ============================================================

// Test Case 1: Dense colored text for selection-behind-text verification
// Select this text and verify selection highlight appears behind the characters
const layerTestTitle: IElement = {
  value: '',
  type: ElementType.TITLE,
  level: TitleLevel.FIRST,
  valueList: [
    {
      value: 'Layer System Tests:',
      size: 18
    }
  ]
}
elementList.push(layerTestTitle)

// Test Case 2: Mixed colored text — selection should appear behind all colors
const colorTestLabel = 'Color test: '
for (const ch of colorTestLabel) {
  elementList.push({ value: ch, size: 16 })
}
const colorSamples = [
  { text: 'RED', color: '#FF0000' },
  { text: ' GREEN', color: '#00AA00' },
  { text: ' BLUE', color: '#0000FF' },
  { text: ' ORANGE', color: '#FF8800' }
]
for (const sample of colorSamples) {
  for (const ch of sample.text) {
    elementList.push({ value: ch, size: 16, color: sample.color, bold: true })
  }
}
elementList.push({ value: '\n', size: 16 })

// Test Case 3: Highlighted + colored text — verify highlight on content canvas,
// selection on selection canvas, both visible without overlap artifacts
const highlightTestLabel = 'Highlight over selection: '
for (const ch of highlightTestLabel) {
  elementList.push({ value: ch, size: 16 })
}
const highlightSamples = 'HIGHLIGHTED TEXT'
for (const ch of highlightSamples) {
  elementList.push({
    value: ch,
    size: 16,
    highlight: '#FFFF00',
    bold: true
  })
}
elementList.push({ value: '\n', size: 16 })

// Test Case 4: Underline + strikeout — verify decorations stay on content canvas
// above selection layer
const decoTestLabel = 'Decorations: '
for (const ch of decoTestLabel) {
  elementList.push({ value: ch, size: 16 })
}
const underlineText = 'underlined'
for (const ch of underlineText) {
  elementList.push({ value: ch, size: 16, underline: true })
}
elementList.push({ value: ' ', size: 16 })
const strikeText = 'strikeout'
for (const ch of strikeText) {
  elementList.push({ value: ch, size: 16, strikeout: true })
}
elementList.push({ value: ' ', size: 16 })
const bothText = 'both'
for (const ch of bothText) {
  elementList.push({
    value: ch,
    size: 16,
    underline: true,
    strikeout: true,
    color: '#9900CC'
  })
}
elementList.push({ value: '\n', size: 16 })

// Test Case 5: Large bold text — easier to visually verify selection behind text
const largeBoldLabel = 'Large text: '
for (const ch of largeBoldLabel) {
  elementList.push({ value: ch, size: 16 })
}
const largeBoldText = 'SELECT ME'
for (const ch of largeBoldText) {
  elementList.push({ value: ch, size: 28, bold: true, color: '#333333' })
}
elementList.push({ value: '\n', size: 16 })

// Test Case 6: Search highlight test — search for "SEARCHABLE" to verify
// search highlights render on selection canvas behind text
const searchTestLabel = 'Search test: '
for (const ch of searchTestLabel) {
  elementList.push({ value: ch, size: 16 })
}
const searchableWord = 'SEARCHABLE'
for (const ch of searchableWord) {
  elementList.push({ value: ch, size: 16, bold: true, color: '#006600' })
}
const searchNote = ' (search this word)'
for (const ch of searchNote) {
  elementList.push({ value: ch, size: 14, color: '#999999' })
}
elementList.push({ value: '\n', size: 16 })

// Test Case 7: RTL/BiDi highlighted text — verify no vertical gaps
// between characters when background color is applied
const rtlHighlightLabel = 'RTL highlight: '
for (const ch of rtlHighlightLabel) {
  elementList.push({ value: ch, size: 16 })
}
const rtlHighlightText = 'التشخيص النهائي والعلاج'
for (const ch of rtlHighlightText) {
  elementList.push({
    value: ch,
    size: 16,
    highlight: '#FFB6C1'
  })
}
elementList.push({ value: '\n', size: 16 })

// Test Case 8: BiDi mixed highlighted text — verify solid background
const bidiHighlightLabel = 'BiDi highlight: '
for (const ch of bidiHighlightLabel) {
  elementList.push({ value: ch, size: 16 })
}
const bidiHighlightText = 'فحص CBC و ESR و CRP'
for (const ch of bidiHighlightText) {
  elementList.push({
    value: ch,
    size: 16,
    highlight: '#B0E0E6',
    bold: true
  })
}
elementList.push({ value: '\n', size: 16 })
elementList.push({ value: '\n', size: 16 })
elementList.push({ value: '\n' })



// ============================================================
// Table Auto-Fit Test Cases (Phase T1)
// These tables simulate wide Google Docs paste scenarios.
// With margins [100,120,100,120] and page width 794,
// innerWidth = 554px. Tables wider than 554px should auto-fit.
// ============================================================

// T1 Test Title
const t1TestTitle: IElement = {
  value: '',
  type: ElementType.TITLE,
  level: TitleLevel.FIRST,
  valueList: [
    {
      value: 'Table Auto-Fit Tests:',
      size: 18
    }
  ]
}
elementList.push(t1TestTitle)

// T1-Test1: Wide 4-column table (total 1200px > 554px innerWidth)
// Simulates a Google Docs table pasted with explicit col widths
// Expected: columns scale proportionally to fit ~554px total
const t1Test1Label = 'T1-1: Wide table (1200px > 554px) — should auto-fit:'
for (const ch of t1Test1Label) {
  elementList.push({ value: ch, size: 12, color: '#666666' })
}
elementList.push({ value: '\n' })
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 400 },
    { width: 300 },
    { width: 300 },
    { width: 200 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'Patient Name'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Diagnosis'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Treatment Plan'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Status'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'Ahmed Al-Rashid'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Type 2 Diabetes'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Metformin 500mg twice daily'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Active'.split('').map(ch => ({
            value: ch, size: 12, color: '#008800'
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: 'Sara Johnson'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Hypertension'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Lisinopril 10mg daily'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1,
          rowspan: 1,
          value: 'Review'.split('').map(ch => ({
            value: ch, size: 12, color: '#CC8800'
          }))
        }
      ]
    }
  ]
})
elementList.push({ value: '\n' })

// T1-Test2: Extremely wide 6-column table (total 2400px)
// Tests proportional scaling with many columns
// Expected: all columns scale down, none below 40px min width
const t1Test2Label = 'T1-2: Very wide 6-col table (2400px) — extreme auto-fit:'
for (const ch of t1Test2Label) {
  elementList.push({ value: ch, size: 12, color: '#666666' })
}
elementList.push({ value: '\n' })
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 500 },
    { width: 400 },
    { width: 400 },
    { width: 400 },
    { width: 400 },
    { width: 300 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'Col A'.split('').map(ch => ({ value: ch, size: 11, bold: true }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Col B'.split('').map(ch => ({ value: ch, size: 11, bold: true }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Col C'.split('').map(ch => ({ value: ch, size: 11, bold: true }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Col D'.split('').map(ch => ({ value: ch, size: 11, bold: true }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Col E'.split('').map(ch => ({ value: ch, size: 11, bold: true }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Col F'.split('').map(ch => ({ value: ch, size: 11, bold: true }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'Data 1'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Data 2'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Data 3'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Data 4'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Data 5'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Data 6'.split('').map(ch => ({ value: ch, size: 11 }))
        }
      ]
    }
  ]
})
elementList.push({ value: '\n' })

// T1-Test3: Wide RTL Arabic table (total 900px)
// Tests that auto-fit works correctly with RTL column ordering
// Expected: scales to 554px AND columns render right-to-left
const t1Test3Label = 'T1-3: Wide RTL Arabic table (900px) — auto-fit + RTL:'
for (const ch of t1Test3Label) {
  elementList.push({ value: ch, size: 12, color: '#666666' })
}
elementList.push({ value: '\n' })
elementList.push({
  type: ElementType.TABLE,
  value: '',
  direction: 'rtl' as const,
  colgroup: [
    { width: 300 },
    { width: 300 },
    { width: 300 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'الحالة'.split('').map(ch => ({
            value: ch, size: 13, bold: true
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'التشخيص'.split('').map(ch => ({
            value: ch, size: 13, bold: true
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'اسم المريض'.split('').map(ch => ({
            value: ch, size: 13, bold: true
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'نشط'.split('').map(ch => ({
            value: ch, size: 12, color: '#008800'
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'سكري النوع الثاني'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'أحمد الراشد'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'مراجعة'.split('').map(ch => ({
            value: ch, size: 12, color: '#CC8800'
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'ارتفاع ضغط الدم'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'سارة محمد'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    }
  ]
})
elementList.push({ value: '\n' })

// T1-Test4: Wide BiDi mixed table (total 1000px)
// Tests auto-fit with mixed Arabic + English content in cells
// Expected: scales to 554px, Arabic text renders RTL within cells
const t1Test4Label = 'T1-4: Wide BiDi mixed table (1000px) — auto-fit + mixed content:'
for (const ch of t1Test4Label) {
  elementList.push({ value: ch, size: 12, color: '#666666' })
}
elementList.push({ value: '\n' })
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 250 },
    { width: 250 },
    { width: 250 },
    { width: 250 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'Patient / المريض'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Test / الفحص'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Result / النتيجة'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Notes / ملاحظات'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'أحمد Ahmed'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'CBC فحص'.split('').map(ch => ({
            value: ch, size: 12
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'طبيعي Normal'.split('').map(ch => ({
            value: ch, size: 12, color: '#008800'
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'متابعة بعد 3 أشهر'.split('').map(ch => ({
            value: ch, size: 12
          }))
        }
      ]
    }
  ]
})
elementList.push({ value: '\n' })

// T1-Test5: Table with merged cells (colspan) wide (total 800px)
// Tests that auto-fit handles colspan correctly
// Expected: scales to 554px, merged cells span proportionally
const t1Test5Label = 'T1-5: Wide table with colspan (800px) — auto-fit + merge:'
for (const ch of t1Test5Label) {
  elementList.push({ value: ch, size: 12, color: '#666666' })
}
elementList.push({ value: '\n' })
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 200 },
    { width: 200 },
    { width: 200 },
    { width: 200 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 4,
          rowspan: 1,
          value: 'Medical Report — التقرير الطبي'.split('').map(ch => ({
            value: ch, size: 14, bold: true
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 2,
          rowspan: 1,
          value: 'Patient Info / بيانات المريض'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        },
        {
          colspan: 2,
          rowspan: 1,
          value: 'Clinical Data / البيانات السريرية'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'Name'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'أحمد سعيد'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'BP'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: '120/80'.split('').map(ch => ({ value: ch, size: 11 }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'Age'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: '35'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Temp'.split('').map(ch => ({ value: ch, size: 11 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: '37.2°C'.split('').map(ch => ({ value: ch, size: 11 }))
        }
      ]
    }
  ]
})
elementList.push({ value: '\n' })

// T1-Test6: Table that already fits (total 400px < 554px)
// Tests that auto-fit does NOT shrink tables that already fit
// Expected: widths preserved exactly as specified
const t1Test6Label = 'T1-6: Table within bounds (400px < 554px) — no change:'
for (const ch of t1Test6Label) {
  elementList.push({ value: ch, size: 12, color: '#666666' })
}
elementList.push({ value: '\n' })
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    { width: 200 },
    { width: 200 }
  ],
  trList: [
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'Key'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'Value'.split('').map(ch => ({
            value: ch, size: 12, bold: true
          }))
        }
      ]
    },
    {
      height: 36,
      tdList: [
        {
          colspan: 1, rowspan: 1,
          value: 'Status'.split('').map(ch => ({ value: ch, size: 12 }))
        },
        {
          colspan: 1, rowspan: 1,
          value: 'OK'.split('').map(ch => ({
            value: ch, size: 12, color: '#008800'
          }))
        }
      ]
    }
  ]
})
elementList.push({ value: '\n' })



// EOF marker
elementList.push(
  ...[
    {
      value: '\n'
    },
    {
      value: '',
      type: ElementType.TAB
    },
    {
      value: 'E',
      size: 16
    },
    {
      value: 'O',
      size: 16
    },
    {
      value: 'F',
      size: 16
    }
  ]
)
elementList.push({ value: '\n' })

export const data: IElement[] = elementList

interface IComment {
  id: string
  content: string
  userName: string
  rangeText: string
  createdDate: string
}
export const commentList: IComment[] = [
  {
    id: '1',
    content:
      'Hematocrit (HCT) refers to the ratio of red blood cell volume to total blood volume per unit volume, used to reflect the proportion of red blood cells to plasma.',
    userName: 'Vana',
    rangeText: 'Hematocrit',
    createdDate: '2026-02-20 23:10:55'
  }
]

export const headerBackgroundImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEBLAEsAAD/4QBWRXhpZgAATU0AKgAAAAgABAEaAAUAAAABAAAAPgEbAAUAAAABAAAARgEoAAMAAAABAAIAAAITAAMAAAABAAEAAAAAAAAAAAEsAAAAAQAAASwAAAAB/+0ALFBob3Rvc2hvcCAzLjAAOEJJTQQEAAAAAAAPHAFaAAMbJUccAQAAAgAEAP/hDIFodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvADw/eHBhY2tldCBiZWdpbj0n77u/JyBpZD0nVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkJz8+Cjx4OnhtcG1ldGEgeG1sbnM6eD0nYWRvYmU6bnM6bWV0YS8nIHg6eG1wdGs9J0ltYWdlOjpFeGlmVG9vbCAxMC4xMCc+CjxyZGY6UkRGIHhtbG5zOnJkZj0naHR0cDovL3d3dy53My5vcmcvMTk5OS8wMi8yMi1yZGYtc3ludGF4LW5zIyc+CgogPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9JycKICB4bWxuczp0aWZmPSdodHRwOi8vbnMuYWRvYmUuY29tL3RpZmYvMS4wLyc+CiAgPHRpZmY6UmVzb2x1dGlvblVuaXQ+MjwvdGlmZjpSZXNvbHV0aW9uVW5pdD4KICA8dGlmZjpYUmVzb2x1dGlvbj4zMDAvMTwvdGlmZjpYUmVzb2x1dGlvbj4KICA8dGlmZjpZUmVzb2x1dGlvbj4zMDAvMTwvdGlmZjpZUmVzb2x1dGlvbj4KIDwvcmRmOkRlc2NyaXB0aW9uPgoKIDxyZGY6RGVzY3JpcHRpb24gcmRmOmFib3V0PScnCiAgeG1sbnM6eG1wTU09J2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8nPgogIDx4bXBNTTpEb2N1bWVudElEPmFkb2JlOmRvY2lkOnN0b2NrOjgwOGIwNDk0LTllM2QtNGQxOS04ZTQ1LTNmOTcwMjQxZmEzNjwveG1wTU06RG9jdW1lbnRJRD4KICA8eG1wTU06SW5zdGFuY2VJRD54bXAuaWlkOmE4NDNhMDYzLTk1YzQtNDZlMC1hODFiLWE1YmQ0NDhhMDI3NzwveG1wTU06SW5zdGFuY2VJRD4KIDwvcmRmOkRlc2NyaXB0aW9uPgo8L3JkZjpSREY+CjwveDp4bXBtZXRhPgogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAo8P3hwYWNrZXQgZW5kPSd3Jz8+/9sAQwAFAwQEBAMFBAQEBQUFBgcMCAcHBwcPCwsJDBEPEhIRDxERExYcFxMUGhURERghGBodHR8fHxMXIiQiHiQcHh8e/9sAQwEFBQUHBgcOCAgOHhQRFB4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4e/8AAEQgBaANZAwERAAIRAQMRAf/EABwAAAMBAQEBAQEAAAAAAAAAAAABAgMEBQYHCP/EAFcQAAEDAgQCBAkGCQgIBgEFAAEAAgMEEQUSITETQQYiUWEUMlJTcYGRodEVI0KSseEkM0NU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'

export const options: IEditorOption = {
  margins: [100, 120, 100, 120],
  lineHeight: 1.0,
  watermark: {
    data: 'Taqniat',
    size: 120
  },
  header: {
    top: 30,
    fullWidth: true,
    contentFullWidth: false,
    background: {
      image: headerBackgroundImage,
      size: BackgroundSize.COVER,
      opacity: 1
    }
  },
  footer: {
    bottom: 30,
    fullWidth: false
  },
  pageNumber: {
    format: 'Page {pageNo} of {pageCount}'
  },
  placeholder: {
    data: 'Enter text here'
  },
  zone: {
    tipDisabled: false
  },
  maskMargin: [60, 0, 30, 0], // Menu bar height 60, bottom toolbar 30 as mask layer
  defaultFont: 'Amiri',
  shaping: {
    enabled: true,
    basePath: '/canvas-editor/harfbuzz',
    fontMapping: {
      'Noto Sans': {
        url: '/canvas-editor/fonts/NotoSans-Regular.ttf',
        boldUrl: '/canvas-editor/fonts/NotoSans-Bold.ttf',
        italicUrl: '/canvas-editor/fonts/NotoSans-Italic.ttf',
        boldItalicUrl: '/canvas-editor/fonts/NotoSans-BoldItalic.ttf'
      },
      'Amiri': {
        url: '/canvas-editor/fonts/Amiri/Amiri-Regular.ttf',
        boldUrl: '/canvas-editor/fonts/Amiri/Amiri-Bold.ttf',
        italicUrl: '/canvas-editor/fonts/Amiri/Amiri-Italic.ttf',
        boldItalicUrl: '/canvas-editor/fonts/Amiri/Amiri-BoldItalic.ttf'
      }
    }
  }
}
