module.exports = {
  extends: ['expo', 'prettier'],
  plugins: ['react', 'react-native'],
  rules: {
    // React Native Paper Button/Chip 텍스트 렌더링 에러 방지
    // Button, Chip 내부의 텍스트는 반드시 한 줄로 작성
    'react/jsx-child-element-spacing': 'off',

    // 불필요한 공백 방지
    'react/jsx-curly-spacing': ['error', { when: 'never', children: true }],

    // JSX에서 여러 줄 텍스트 경고
    'react/jsx-no-literals': ['warn', {
      noStrings: false,
      allowedStrings: [],
      ignoreProps: true,
      noAttributeStrings: false
    }],

    // console.log 사용 경고 (프로덕션)
    'no-console': ['warn', { allow: ['warn', 'error'] }],

    // 사용하지 않는 변수 경고
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

    // TypeScript 관련
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
  },
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'warn',
      },
    },
  ],
};
