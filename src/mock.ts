import {
  ControlType,
  ElementType,
  IEditorOption,
  IElement,
  ListType,
  TitleLevel
} from './editor'

const text = `Chief Complaint:\nFever for three days, cough for five days.\n\nHistory of Present Illness:\nThe patient developed facial edema without obvious cause three days ago after catching a cold, no rash, decreased urine output, fatigue appeared, no improvement with external treatment, now comes to our hospital for consultation.\n\nPast Medical History:\nDiabetes for 10 years, hypertension for 2 years, infectious disease for 1 year. Report other past medical conditions.\nEpidemiological History:\nDenies contact with confirmed patients, suspected patients, asymptomatic carriers and their close contacts within 14 days; Denies visiting the following places within 14 days: seafood and meat wholesale markets, farmers markets, fairs, large supermarkets, night markets; Denies close contact with staff from the following places within 14 days: seafood and meat wholesale markets, farmers markets, fairs, large supermarkets; Denies 2 or more clustered cases in the surrounding area (such as home, office) within 14 days; Denies contact with people with fever or respiratory symptoms within 14 days; Denies having fever or respiratory symptoms within 14 days; Denies contact with people under isolation observation and other situations that may be associated with COVID-19 within 14 days; Accompanying family members have none of the above situations.\n\nPhysical Examination:\nT: 39.5°C, P: 80bpm, R: 20/min, BP: 120/80mmHg;\n\nAuxiliary Examination:\nJune 10, 2020, Radiology: Hematocrit 36.50% (low) 40~50; Monocyte absolute value 0.75*10/L (high) Reference value: 0.1~0.6;\n\nOutpatient Diagnosis: Treatment: Electronic Signature: []\n\nOther Records:`

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

// Simulate dropdown control
elementList.splice(94, 0, {
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
elementList.splice(116, 0, {
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
elementList.splice(335, 0, {
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
elementList.splice(346, 0, {
  value: '∆',
  color: '#FF0000',
  type: ElementType.SUBSCRIPT
})

// Simulate superscript
elementList.splice(430, 0, {
  value: '9',
  type: ElementType.SUPERSCRIPT
})

// Simulate list
elementList.splice(451, 0, {
  value: '',
  type: ElementType.LIST,
  listType: ListType.OL,
  valueList: [
    {
      value: 'Hypertension\nDiabetes\nViral Cold\nAllergic Rhinitis\nAllergic'
    }
  ]
})

elementList.splice(453, 0, {
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

// Simulate fixed length underline
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

// Simulate ending text
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

// ⭐ NEW: Add comprehensive bidirectional text test cases
elementList.push(
  ...[
    {
      value: '\n\n'
    },
    {
      value: '═══════════════════════════════════════',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: 'BIDIRECTIONAL TEXT TESTS (RTL ⇄ LTR)',
      size: 18,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '═══════════════════════════════════════',
      size: 16,
      bold: true
    },
    {
      value: '\n\n'
    },
    
    // Test 1: Pure Arabic
    {
      value: '1. Pure RTL (Arabic):',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   ',
      size: 16
    },
    {
      value: 'مرحباً بكم في محرر النصوص ثنائي الاتجاه', // "Welcome to the bidirectional text editor"
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 2: Mixed English and Arabic (multiple switches)
    {
      value: '2. Mixed LTR+RTL (Multiple Switches):',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   The word ',
      size: 16
    },
    {
      value: 'مرحبا', // "hello"
      size: 16
    },
    {
      value: ' means hello and ',
      size: 16
    },
    {
      value: 'شكرا', // "thank you"
      size: 16
    },
    {
      value: ' means thank you.',
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 3: Numbers in Arabic context
    {
      value: '3. Numbers in RTL Context:',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   ',
      size: 16
    },
    {
      value: 'التاريخ: ', // "Date: "
      size: 16
    },
    {
      value: '2024/01/14',
      size: 16
    },
    {
      value: '، السعر: ', // ", Price: "
      size: 16
    },
    {
      value: '1,250.99',
      size: 16
    },
    {
      value: ' دولار', // " dollars"
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 4: Nested parentheses and quotes
    {
      value: '4. Nested Parentheses & Quotes:',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   English text (',
      size: 16
    },
    {
      value: 'نص عربي', // "Arabic text"
      size: 16
    },
    {
      value: ' with "',
      size: 16
    },
    {
      value: 'اقتباس', // "quote"
      size: 16
    },
    {
      value: '") inside.',
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 5: Punctuation handling
    {
      value: '5. Punctuation in Mixed Text:',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   ',
      size: 16
    },
    {
      value: 'هل تتحدث الإنجليزية؟', // "Do you speak English?"
      size: 16
    },
    {
      value: ' Yes! I speak ',
      size: 16
    },
    {
      value: 'العربية', // "Arabic"
      size: 16
    },
    {
      value: ', too.',
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 6: Email and URLs
    {
      value: '6. Email & URL in RTL:',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   ',
      size: 16
    },
    {
      value: 'البريد الإلكتروني: ', // "Email: "
      size: 16
    },
    {
      value: 'user@example.com',
      size: 16
    },
    {
      value: ' والموقع: ', // " and website: "
      size: 16
    },
    {
      value: 'https://example.com',
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 7: Long mixed paragraph
    {
      value: '7. Long Mixed Paragraph:',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   In modern software development, supporting ',
      size: 16
    },
    {
      value: 'النصوص ثنائية الاتجاه', // "bidirectional text"
      size: 16
    },
    {
      value: ' is essential. Languages like ',
      size: 16
    },
    {
      value: 'العربية', // "Arabic"
      size: 16
    },
    {
      value: ' read from right to left, while English reads left to right. The Unicode Bidirectional Algorithm (UAX#9) handles this complexity by analyzing text and applying the correct display order.',
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 8: Mathematical expressions
    {
      value: '8. Math Expressions in RTL:',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   ',
      size: 16
    },
    {
      value: 'المعادلة: ', // "Equation: "
      size: 16
    },
    {
      value: 'E = mc²',
      size: 16
    },
    {
      value: ' حيث ',  // " where "
      size: 16
    },
    {
      value: 'E',
      size: 16
    },
    {
      value: ' تمثل الطاقة', // " represents energy"
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 9: Multiple direction changes in one line
    {
      value: '9. Rapid Direction Switching:',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   A ',
      size: 16
    },
    {
      value: 'ب', // "b"
      size: 16
    },
    {
      value: ' C ',
      size: 16
    },
    {
      value: 'د', // "d"
      size: 16
    },
    {
      value: ' E ',
      size: 16
    },
    {
      value: 'و', // "w"
      size: 16
    },
    {
      value: ' G ',
      size: 16
    },
    {
      value: 'ح', // "h"
      size: 16
    },
    {
      value: ' I',
      size: 16
    },
    {
      value: '\n\n'
    },

    // Test 10: File paths in RTL context
    {
      value: '10. File Paths in RTL:',
      size: 16,
      bold: true
    },
    {
      value: '\n'
    },
    {
      value: '   ',
      size: 16
    },
    {
      value: 'المسار: ', // "Path: "
      size: 16
    },
    {
      value: 'C:\\Users\\Documents\\',
      size: 16
    },
    {
      value: 'ملفات', // "files"
      size: 16
    },
    {
      value: '\\data.txt',
      size: 16
    },
    {
      value: '\n\n'
    }
  ]
)

// ⭐ NEW: Add Contract-Style Table with English (LTR) and Arabic (RTL)
elementList.push({
  value: '\n\n'
})

elementList.push({
  value: '═══════════════════════════════════════',
  size: 16,
  bold: true
})

elementList.push({
  value: '\n'
})

elementList.push({
  value: 'EMPLOYMENT CONTRACT / عقد العمل',
  size: 18,
  bold: true
})

elementList.push({
  value: '\n'
})

elementList.push({
  value: '═══════════════════════════════════════',
  size: 16,
  bold: true
})

elementList.push({
  value: '\n\n'
})

// Contract table
elementList.push({
  type: ElementType.TABLE,
  value: '',
  colgroup: [
    {
      width: 250  // English column (left)
    },
    {
      width: 250  // Arabic column (right)
    }
  ],
  trList: [
    // Header Row
    {
      height: 50,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          backgroundColor: '#E8F4F8',
          value: [
            { 
              value: 'English Terms',
              size: 16,
              bold: true
            }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          backgroundColor: '#E8F4F8',
          value: [
            { 
              value: 'الشروط العربية',  // "Arabic Terms"
              size: 16,
              bold: true
            }
          ]
        }
      ]
    },
    // Row 1: Contract parties
    {
      height: 60,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'This Employment Contract is entered into between the Employer and the Employee on this date.',
              size: 14
            }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'تم إبرام عقد العمل هذا بين صاحب العمل والموظف في هذا التاريخ.',
              size: 14
            }
          ]
        }
      ]
    },
    // Row 2: Position & Salary
    {
      height: 80,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'Position: ',
              size: 14,
              bold: true
            },
            {
              value: 'Software Engineer',
              size: 14
            },
            {
              value: '\nMonthly Salary: ',
              size: 14,
              bold: true
            },
            {
              value: '$5,000.00',
              size: 14
            },
            {
              value: '\nStart Date: ',
              size: 14,
              bold: true
            },
            {
              value: '2024/02/01',
              size: 14
            }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'المسمى الوظيفي: ',  // "Position: "
              size: 14,
              bold: true
            },
            {
              value: 'مهندس برمجيات',  // "Software Engineer"
              size: 14
            },
            {
              value: '\nالراتب الشهري: ',  // "\nMonthly Salary: "
              size: 14,
              bold: true
            },
            {
              value: '5,000.00',
              size: 14
            },
            {
              value: ' دولار',  // " dollars"
              size: 14
            },
            {
              value: '\nتاريخ البدء: ',  // "\nStart Date: "
              size: 14,
              bold: true
            },
            {
              value: '2024/02/01',
              size: 14
            }
          ]
        }
      ]
    },
    // Row 3: Working hours
    {
      height: 60,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'Working Hours: ',
              size: 14,
              bold: true
            },
            {
              value: 'Monday to Friday, 9:00 AM - 5:00 PM (40 hours per week)',
              size: 14
            }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'ساعات العمل: ',  // "Working Hours: "
              size: 14,
              bold: true
            },
            {
              value: 'من الاثنين إلى الجمعة، من الساعة ',  // "Monday to Friday, from "
              size: 14
            },
            {
              value: '9:00',
              size: 14
            },
            {
              value: ' صباحاً إلى ',  // " AM to "
              size: 14
            },
            {
              value: '5:00',
              size: 14
            },
            {
              value: ' مساءً (',  // " PM ("
              size: 14
            },
            {
              value: '40',
              size: 14
            },
            {
              value: ' ساعة أسبوعياً)',  // " hours per week)"
              size: 14
            }
          ]
        }
      ]
    },
    // Row 4: Benefits
    {
      height: 80,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'Benefits:\n',
              size: 14,
              bold: true
            },
            {
              value: '• Health Insurance\n',
              size: 14
            },
            {
              value: '• 21 days annual leave\n',
              size: 14
            },
            {
              value: '• Retirement plan',
              size: 14
            }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'المزايا:\n',  // "Benefits:\n"
              size: 14,
              bold: true
            },
            {
              value: '• التأمين الصحي\n',  // "• Health Insurance\n"
              size: 14
            },
            {
              value: '• ',
              size: 14
            },
            {
              value: '21',
              size: 14
            },
            {
              value: ' يوم إجازة سنوية\n',  // " days annual leave\n"
              size: 14
            },
            {
              value: '• خطة التقاعد',  // "• Retirement plan"
              size: 14
            }
          ]
        }
      ]
    },
    // Row 5: Probation period
    {
      height: 50,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'Probation Period: ',
              size: 14,
              bold: true
            },
            {
              value: '90 days from the start date',
              size: 14
            }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'فترة التجربة: ',  // "Probation Period: "
              size: 14,
              bold: true
            },
            {
              value: '90',
              size: 14
            },
            {
              value: ' يوماً من تاريخ البدء',  // " days from the start date"
              size: 14
            }
          ]
        }
      ]
    },
    // Row 6: Termination clause
    {
      height: 70,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'Termination: ',
              size: 14,
              bold: true
            },
            {
              value: 'Either party may terminate this contract with 30 days written notice.',
              size: 14
            }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          value: [
            { 
              value: 'إنهاء العقد: ',  // "Termination: "
              size: 14,
              bold: true
            },
            {
              value: 'يجوز لأي من الطرفين إنهاء هذا العقد بإشعار كتابي مدته ',  // "Either party may terminate this contract with written notice of "
              size: 14
            },
            {
              value: '30',
              size: 14
            },
            {
              value: ' يوماً.',  // " days."
              size: 14
            }
          ]
        }
      ]
    },
    // Row 7: Signatures
    {
      height: 80,
      tdList: [
        {
          colspan: 1,
          rowspan: 1,
          backgroundColor: '#F5F5F5',
          value: [
            { 
              value: 'Employee Signature:\n\n',
              size: 14,
              bold: true
            },
            {
              value: '___________________________\n',
              size: 14
            },
            {
              value: 'Date: _______________',
              size: 14
            }
          ]
        },
        {
          colspan: 1,
          rowspan: 1,
          backgroundColor: '#F5F5F5',
          value: [
            { 
              value: 'توقيع الموظف:\n\n',  // "Employee Signature:\n\n"
              size: 14,
              bold: true
            },
            {
              value: '___________________________\n',
              size: 14
            },
            {
              value: 'التاريخ: _______________',  // "Date: _______________"
              size: 14
            }
          ]
        }
      ]
    }
  ]
})

elementList.push({
  value: '\n\n'
})

elementList.push({
  value: '─────────────────────────────────────',
  size: 14
})

elementList.push({
  value: '\n'
})

elementList.push({
  value: 'Note: This contract demonstrates bidirectional text handling in table cells. / ',
  size: 12,
  color: '#666666'
})

elementList.push({
  value: 'ملاحظة: يوضح هذا العقد معالجة النص ثنائي الاتجاه في خلايا الجدول.',
  size: 12,
  color: '#666666'
})

elementList.push({
  value: '\n'
})

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
    userName: 'Hufe',
    rangeText: 'Hematocrit',
    createdDate: '2023-08-20 23:10:55'
  }
]

export const options: IEditorOption = {
  margins: [100, 120, 100, 120],
  watermark: {
    data: 'Taqniat',
    size: 120
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
  maskMargin: [60, 0, 30, 0] // Menu bar height 60, bottom toolbar 30 as mask layer
}
