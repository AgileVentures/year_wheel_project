
# YearWheel Planner

A modern, AI-powered annual planning tool that helps you visualize your entire year at a glance. Built with React, Supabase, and OpenAI.

## ✨ Features

- 🎨 **Visual Year Planning**: Circular calendar view showing your entire year in one interactive wheel
- 🤖 **AI Assistant**: Natural language planning powered by OpenAI - just describe what you want
- 📊 **Google Integration**: Sync with Google Calendar and Google Sheets (Premium)
- 👥 **Team Collaboration**: Share wheels with unlimited team members (Premium)
- 📤 **Multiple Export Formats**: PNG, SVG, PDF, JPG with high-resolution support
- 🔄 **Version Control**: Track changes and restore previous versions (Premium)
- 📱 **Responsive Design**: Optimized for desktop, tablet, and mobile devices
- 🎯 **Multi-Year Support**: Plan across multiple years in a single project


## Brand Colors

YearWheel uses a carefully crafted color palette that evokes trust, clarity, and the natural flow of time through the year.

### Text Colors

| Element | Color Name | HEX | RGB | Usage |
|---------|-----------|-----|-----|-------|
| "YEAR" | Teal/Cyan | `#00A4A6` | (0, 164, 166) | Primary brand color, CTAs, accents |
| "WHEEL" | Deep Blue/Indigo | `#1E1EBE` | (30, 30, 190) | Secondary text, headers |

### Wheel Icon Colors

The circular "wheel" symbol uses a gradient palette representing balance, clarity, and seasonal flow:

| Segment | Color Description | HEX | RGB | Usage |
|---------|------------------|-----|-----|-------|
| A | Deep navy blue | `#1B2A63` | (27, 42, 99) | Backgrounds, dark overlays |
| B | Royal blue | `#2D4EC8` | (45, 78, 200) | Active elements, interactive states |
| C | Teal green | `#2E9E97` | (46, 158, 151) | Hover states, secondary CTAs |
| D | Turquoise | `#36C2C6` | (54, 194, 198) | Accent highlights, badges |
| E | Light aqua | `#A4E6E0` | (164, 230, 224) | Subtle text, borders, backgrounds |
| F | Lime green | `#9FCB3E` | (159, 203, 62) | Success states, growth indicators |
| G | Deep forest green | `#336B3E` | (51, 107, 62) | Alternative dark accent |
| H | White/neutral | `#FFFFFF` | (255, 255, 255) | Text on dark, card backgrounds |

### Color Philosophy

- **Blue-green tones** (trust, calm, clarity) form the foundation
- **Green-lime accents** (growth, renewal, vitality) add energy
- **Gradient transitions** from teal to deep blue reinforce the "wheel motion" concept
- **Natural + digital hues** balance structure with creativity, perfect for planning tools

### Implementation

Use these colors consistently across:
- Hero sections (navy + teal gradients)
- CTAs (teal primary, white secondary)
- Badges (turquoise with light aqua text)
- Interactive elements (royal blue for hover, teal for active)
- Text hierarchy (white on dark, light aqua for secondary text)
    
    

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ installed on your machine
- Yarn package manager
- Supabase account (for backend services)
- OpenAI API key (for AI assistant - optional)
- Google Cloud project with Calendar & Sheets API enabled (for integrations - optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/tochman/year_wheel_poc.git
   cd year_wheel_poc
   ```

2. **Install dependencies**
   ```bash
   yarn install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run database migrations**
   
   Apply the migrations in the `supabase/migrations` folder to your Supabase project.

5. **Start the development server**
   ```bash
   yarn dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5173`

### Project Structure

```
year_wheel_poc/
├── src/
│   ├── components/      # React components
│   │   ├── dashboard/   # Dashboard and wheel cards
│   │   ├── teams/       # Team collaboration
│   │   ├── auth/        # Authentication
│   │   └── subscription/# Premium features
│   ├── hooks/           # Custom React hooks
│   ├── services/        # API services (Supabase, AI, etc.)
│   ├── lib/            # Utilities and configurations
│   └── YearWheelClass.js # Core canvas rendering engine
├── supabase/
│   ├── functions/       # Edge Functions (AI, integrations)
│   └── migrations/      # Database schema migrations
└── public/             # Static assets
```

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **AI**: OpenAI GPT-4 for natural language planning
- **Integrations**: Google Calendar API, Google Sheets API
- **Payments**: Stripe for subscription management
- **Canvas Rendering**: Custom HTML5 Canvas with SVG export via canvas2svg

## 💡 Key Features Explained

### Multi-Ring Organization
Create inner and outer rings to organize different categories (campaigns, projects, holidays). Each ring can have its own color scheme and visibility settings.

### AI-Powered Planning
The AI assistant understands natural language commands like:
- "Create a campaign in March and copy it to September"
- "Add 10 meetings evenly distributed across Q1"
- "Extend the product launch to mid-April"

### Cross-Year Planning
Projects can span multiple years. The system automatically distributes activities across different year pages based on their dates.

### Real-Time Collaboration
Multiple team members can work on the same wheel simultaneously with presence indicators and live updates.

### Google Integration (Premium)
- **Calendar Sync**: Import Google Calendar events directly into your wheel
- **Sheets Sync**: Connect spreadsheets to automatically create and update activities
- **Auto-Distribution**: Activities are intelligently placed across years based on dates

## 🎯 Roadmap

### Completed ✅
- ✅ Multi-year support with automatic cross-year distribution
- ✅ AI Assistant with natural language processing
- ✅ Google Calendar & Sheets integration
- ✅ Team collaboration with real-time presence
- ✅ Version control and history
- ✅ Public wheel sharing
- ✅ Stripe subscription management
- ✅ Responsive dashboard with modern card design
- ✅ High-resolution export (PNG, SVG, PDF, JPG)

### Planned 🚧
- 🔄 Internationalization (i18n) support
- 🔄 RTL language support (Arabic, Farsi)
- 🔄 Mobile app (React Native)
- 🔄 Drag-and-drop ring reorganization
- 🔄 Custom wheel templates
- 🔄 Advanced color themes and palettes
- 🔄 Activity dependencies and milestones
- 🔄 Notification system for deadlines

## 🤝 Contributing

Contributions are warmly welcomed! Here's how you can help:

### Ways to Contribute
- **💻 Code**: Fix bugs, add features, or improve performance
- **📚 Documentation**: Improve guides, add tutorials, or fix typos
- **🐛 Testing**: Report bugs, test features, or write test cases
- **💡 Ideas**: Suggest features or improvements via GitHub Issues
- **🌍 Translations**: Help translate the app (coming soon)

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Commit with clear messages (`git commit -m 'Add amazing feature'`)
5. Push to your fork (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Code Style
- Use ESLint and Prettier configurations
- Write clear, descriptive commit messages
- Add comments for complex logic
- Follow React best practices and hooks patterns

## 📄 License

This project is licensed [under the MIT License](LICENSE.md).

## 💪 Why Open Source?

Open Source Software (OSS) is more than just free code—it's about fostering a culture of collaboration, innovation, and shared learning. By contributing to YearWheel, you become part of a global community that believes in building software that's accessible, reliable, and capable of driving real-world change.

OSS empowers developers to stand on the shoulders of giants, enabling us to create complex and reliable systems faster than ever before. Together, we can harness the collective power of open source to make planning and visualizing yearly activities more intuitive and effective.

**Let's create something truly awesome together! 🚀**

````
* Feature: Enable users to add events to different sections within each ring.
* Customization: Users can adjust the number of sections per ring, the text orientation, and the font size for event descriptions.
* User story: _As a user, in order to personalize how events are displayed, I would like to add events to different sections within each ring, with control over the number of sections, text orientation, and font size._

### Interactive Event Details Pop-Up Feature
* **Feature**: Allow users to click on a text or section within the wheel to reveal more detailed information about the event in a pop-up or modal.
* **Customization**: Users can control the layout, style, and content of the pop-up or modal, such as adding images, videos, links, or extended descriptions.
* **User Story**: _As a user, in order to access more in-depth information about an event, I would like to click on a text within the wheel and see a pop-up or modal with detailed event descriptions and multimedia content._

### Color Coding and Legends
* Feature: Users can define a color code for different types of events or categories.
* Customization: Include a legend that explains the meaning of each color, placed outside the wheel or integrated within the design.
* User story: _As a user, in order to easily understand the significance of different events, I would like to define a color code for event categories and have a legend to explain each color._

### Logos and Icons within Sections
* Feature: Allow users to upload logos or icons and place them within specific sections of the rings.
* Customization: Users can control the size, placement, and rotation of the logos/icons.
* User story: _As a user, in order to visually represent specific events or categories, I would like to upload logos or icons into sections with control over their size, placement, and rotation._

### Radial Grids and Time Dividers
* Feature: Implement radial grids or time dividers that break down each ring into smaller time segments (e.g., weeks or days).
* Customization: Users can adjust the number of segments and their visual style.
* User story: _As a user, in order to break down time within the wheel, I would like to implement radial grids or time dividers that segment the rings into smaller periods, with customizable segments and visual styles._

### Central Information Display
* Feature: Centralize the title, year, and other key information in the middle of the wheel.
* Customization: Users can choose the font style, size, and additional details like descriptions or summaries.
* User story: _As a user, in order to clearly display important information, I would like the title, year, and key details to be centralized in the middle of the wheel with customizable fonts and additional descriptions._

### Text Wrapping and Layout Options
* Feature: Provide advanced text layout options, such as wrapping text within sections or allowing multiline text.
* Customization: Users can set line spacing, text alignment, and maximum character limits for each section.
* User story: _As a user, in order to optimize text readability, I would like to use text wrapping, multiline options, and set line spacing, alignment, and character limits for each section._

### Custom Backgrounds and Borders
* Feature: Allow users to set custom backgrounds or borders for the entire wheel or individual rings.
* Customization: Users can upload images, set gradient backgrounds, or select solid colors.
* User story: _As a user, in order to enhance the visual appeal of the wheel, I would like to customize the backgrounds and borders with images, gradients, or solid colors._

### Export Options with High-Resolution Support
* Feature: Offer multiple export options, including PNG, JPEG, SVG, and PDF, with high-resolution support for printing.
* Customization: Users can choose to export with or without a background and select the DPI for printing.
* User story: _As a user, in order to share or print the wheel, I would like to export it in various formats with high-resolution support and customizable options for backgrounds and DPI._

### Drag-and-Drop Interface
* Feature: Implement a drag-and-drop interface to easily move and adjust event sections or categories within the wheel.
* Customization: Users can reposition sections or entire rings with ease.
* User story: _As a user, in order to easily rearrange the wheel’s layout, I would like to use a drag-and-drop interface to move and adjust sections or entire rings._

### Interactive Wheel Features
* Feature: Allow users to create interactive wheels where sections can be clicked to reveal more information (e.g., pop-ups or links).
* Customization: Users can set the interaction type (e.g., click, hover) and the content that appears.
* User story: _As a user, in order to access more detailed information, I would like the wheel sections to be interactive with clickable or hoverable elements that reveal additional content._

### Time-Based Animation
* Feature: Implement a time-based animation where the wheel rotates to show the progression of time, or to highlight specific events.
* Customization: Users can set the speed of the animation and decide which rings should animate.
* User story: _As a user, in order to visualize the progression of time, I would like the wheel to rotate over time or highlight specific events, with control over the animation speed and which rings animate._

### Annotation and Markup Tools
* Feature: Provide tools for users to add annotations or markups directly on the wheel (e.g., arrows, highlights).
* Customization: Users can choose from different annotation styles and colors.
* User story: _As a user, in order to emphasize important details, I would like to add annotations or markups directly on the wheel using different styles and colors._
## License
This project is licensed [under the MIT License](LICENSE.md).

##  How You Can Contribute
Feel free to clone, fork, and contribute to this project. Here are a few ways you can make an impact:

* Code Contributions: From fixing bugs to adding new features, your code contributions can significantly improve the project.
* Documentation: Help new users get started and reduce the learning curve by improving documentation, adding tutorials, or writing usage guides.
* Feedback and Ideas: Share your insights and suggestions for new features or improvements. Fresh perspectives are invaluable.
* Testing: Test the software in different environments and report any issues or bugs you encounter. This helps improve the stability and reliability of the software.
  
Open Source Software (OSS) is not just about accessing free code; it's about fostering a culture of collaboration, innovation, and shared learning. By contributing to this project, you become part of a global community that believes in building software that's accessible, reliable, and capable of driving real-world change. OSS empowers developers to stand on the shoulders of giants, enabling us to create complex and reliable systems faster than ever before.

Let's harness the collective power of open source to make planning and visualizing yearly activities more intuitive and effective. Together, we can create something truly awesome.


