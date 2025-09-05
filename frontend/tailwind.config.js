/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3B82F6', // 自定义主色调
        secondary: '#10B981', // 次要色调
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], // 使用自定义无衬线字体
      },
      spacing: {
        '128': '32rem', // 添加一个额外的间距值
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // 启用表单样式插件
    require('@tailwindcss/typography'), // 启用排版插件
  ],
}