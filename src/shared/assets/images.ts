// Single place where every bundled game image is require()'d. Screens import
// from here instead of reaching into ../../../assets with a relative path, so
// moving a feature folder around never breaks an image.
export const images = {
  appIcon: require('../../../assets/images/game/icon.jpg'),

  // Onboarding / auth backdrops
  splash: require('../../../assets/images/game/splash.jpg'),
  welcomeBackground: require('../../../assets/images/game/welcomebackground.jpg'),
  welcomeIcon: require('../../../assets/images/game/welcomeicon.png'),
  termsBackground: require('../../../assets/images/game/langaugeTE.jpg'),
  studentLogo: require('../../../assets/images/game/studentlogo.jpg'),
  teacherLogo: require('../../../assets/images/game/teacherlogo.jpg'),

  // Dashboards
  studentDashboard: require('../../../assets/images/game/stdashboard.jpg'),
  teacherDashboard: require('../../../assets/images/game/tdasboard.jpg'),

  // Category tiles
  catHistory: require('../../../assets/images/game/history.jpg'),
  catCulture: require('../../../assets/images/game/ct.jpg'),
  catGeography: require('../../../assets/images/game/geography.jpg'),
  catFestival: require('../../../assets/images/game/fa.jpg'),
  catNational: require('../../../assets/images/game/ns.jpg'),
  catHeroes: require('../../../assets/images/game/fh.jpg'),

  // Jigsaw / mini-lesson pictures
  katipunan: require('../../../assets/images/game/kkk.jpg'),
  tinikling: require('../../../assets/images/game/tinikling.jpg'),
  riceTerraces: require('../../../assets/images/game/ricefield.jpg'),
  flag: require('../../../assets/images/game/flag.jpg'),
  rizal: require('../../../assets/images/game/rizal.jpg'),
};

export default images;
