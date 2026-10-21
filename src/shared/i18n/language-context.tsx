import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'tl';

/** Where the chosen language survives a restart. */
const STORAGE_KEY = '@juanwise/language';

const en = {
  chooseLanguage: 'SELECT YOUR LANGUAGE',
  tagalog: 'TAGALOG',
  english: 'ENGLISH',

  loginTitle: 'LOGIN',
  studentAcc: 'STUDENT ACC',
  teacherAcc: 'TEACHER ACC',
  username: 'Username',
  password: 'Password',
  forgotPassword: 'Forgot Password?',
  loginBtn: 'LOGIN',
  noAccount: "Don't have an account?",
  signUp: 'Sign Up',
  missingInfo: 'Missing Info',
  enterUsernamePass: 'Please enter username and password.',

  registerTitle: 'REGISTER',
  student: 'STUDENT',
  teacher: 'TEACHER',
  lrn: 'LRN',
  fullName: 'Full Name',
  age: 'Age',
  grade: 'Grade',
  section: 'Section',
  email: 'Email',
  teacherId: 'Teacher ID',
  handleGrade: 'Handle Grade',
  depedGmail: 'Teacher Email',
  registerBtn: 'REGISTER',
  haveAccount: 'Already have an account?',
  signIn: 'Sign in',
  registerSuccess: 'Success',
  registerSuccessMsg: 'Account registered! You can now log in.',
  fillUsernamePass: 'Please fill in username and password.',
  noAccountFound: 'No Account Found',
  noAccountFoundMsg: 'No registered account yet. Please register first.',
  wrongAccountType: 'Wrong Account Type',
  wrongAccountTypeMsg: 'This account is not registered under the selected tab. Please switch to the correct account type.',
  invalidLogin: 'Invalid Login',
  invalidLoginMsg: 'Incorrect username or password.',

  forgotStudentTitle: 'STUDENT ACCOUNT GMAIL (recovery)',
  forgotTeacherTitle: 'TEACHER EMAIL (recovery)',
  studentGmailLabel: 'Registered Gmail',
  teacherGmailLabel: 'Registered Teacher Email',
  step1Title: 'Reset your password',
  step1Desc: 'Enter your {email}. We will email you a secure link to set a new password.',
  sendOtpBtn: 'Send Reset Link',
  step5Title: 'CHECK YOUR EMAIL',
  resetSuccessMsg:
    'If that address is registered, a password reset link is on its way. Open it on this device, choose a new password, then come back and log in.',
  resetEmailNote: 'The link expires after a short while — request another one if it does.',
  backToLogin: 'Back to Login',
  backLink: '← Back to Login',

  coins: 'Coins',
  points: 'Points',
  categories: 'CATEGORIES',
  miniLessons: 'MINI-LESSONS',
  quiz: 'QUIZ',
  jigsawPuzzle: 'JIGSAW PUZZLE',
  leaderboard: 'LEADERBOARD',

  teacherEdition: 'Teacher Edition',
  classOverview: 'Class Overview',
  leaderBoard: 'Leader Board',
  classContent: 'Class Content',
  performanceProgression: 'Performance Progression',
  profileSettings: 'PROFILE SETTINGS',
  gradeLabel: 'Grade',
  totalStudents: 'Total Students',

  classCodeLabel: 'Class Code',
  generateCode: 'Generate Code',
  editCode: 'Edit',
  saveCode: 'Save',
  cancelCode: 'Cancel',
  copyCode: 'Copy',
  codeCopied: 'Class code copied!',
  invalidClassCode: 'Invalid Class Code',
  joinedStudents: 'Joined Students',
  noStudentsYet: 'No students yet. Share your class code so they can join.',
  removeStudentTitle: 'Remove from Class?',
  removeStudentMsg: '{name} will be removed from the roster. Their recorded results are kept.',
  removeStudentBtn: 'Remove',
  lrnShort: 'LRN',
  gmailShort: 'Gmail',
  enterCode: 'Enter Class Code',
  enrolledStatus: 'Enrolled ✓',

  gameTypeQuiz: 'Quiz',
  gameTypeJigsaw: 'Jigsaw Puzzle',
  quizContentBtn: 'Quiz Content',
  jigsawContentBtn: 'Jigsaw Pictures & Lessons',
  contentManagementTitle: 'Content Management',
  contentPackCardTitle: 'Activity Management',
  contentPackNoneAssigned: 'No pack assigned — playing the starter set',
  contentPackStudentsDesc: 'Students play quizzes and jigsaw puzzles from this pack instead of the starter set.',
  contentPackChangeBtn: 'Change Pack',
  contentPackClearBtn: 'Clear',
  contentPackBoundLinked: 'Shared',
  contentPackBoundCopied: 'Your own copy',
  managePacksBtn: 'Activity Management',
  assignPackDialogTitle: 'Open Activity Management',
  assignPackShareBtn: 'Share it',
  assignPackCopyBtn: 'Make a copy',
  assignPackLoadErrorTitle: 'Could Not Load',
  assignPackAssignErrorTitle: 'Could Not Assign',
  contentPackNoClassMsg: "You don't have a class yet.",
  contentPackAssignedMsg: 'Pack assigned.',
  contentPackAssignFailedMsg: 'Could not assign the pack.',
  contentPackClearFailedMsg: 'Could not clear the pack.',

  categoriesTitle: 'CATEGORIES OF PHILIPPINES KNOWLEDGE',
  catHistory: 'History',
  catCulture: 'Culture & Tradition',
  catGeography: 'Geography',
  catFestival: 'Festival Arts',
  catNational: 'National Symbols',
  catHeroes: 'Filipino Heroes',

  chooseActivity: 'Choose one Interactive Activity',

  levelProgressionMap: 'LEVEL PROGRESSION MAP',
  level: 'Level',

  completed: 'Completed',
  activity: 'Activity',
  pieces: 'pieces',
  shufflePieces: 'Shuffle pieces',
  backToLevelMap: '← Back to Level Map',
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',

  successFormed: 'Correct! You formed it!',
  continueBtn: 'Continue',
  time: 'Time',

  studentAccountTitle: 'Student Account',
  teacherAccountTitle: 'Teacher Account',
  juanWiseTitle: 'JuanWise',
  dashboardHomeTab: 'Home',
  dashboardProfileTab: 'Profile',

  medalGold: 'Gold',
  medalSilver: 'Silver',
  medalBronze: 'Bronze',
  timeUsedSuffix: 's used',
  ptsSuffix: 'pts',
  timeUpTitle: "⏰ Time's Up!",
  timeUpDesc: 'You ran out of time before finishing the puzzle. Try again — 60 seconds per attempt.',
  tryAgainBtn: 'Try Again',
  backBtn: '← Back',

  studentProfileTitle: 'Student Profile Settings',
  adminProfileTitle: 'Admin Profile Settings',
  updateProfileInfoBtn: 'UPDATE PROFILE INFO',
  changePasswordBtn: 'CHANGE PASSWORD',
  settingsBtn: 'SETTINGS',
  logOutBtn: 'LOG OUT',

  settingsTitle: 'Settings',
  soundsLabel: 'Sounds',
  helpLabel: 'Help',
  aboutGameLabel: 'About Game',
  termsConditionsLabel: 'Terms and Conditions',
  privacyRightsLabel: 'Privacy Rights',
  privacyPreferencesLabel: 'Privacy Preferences',
  versionLabel: 'Version',
  copyrightLabel: 'All rights reserved.',
  termsOfServiceLabel: 'Terms of Service',
  privacyPolicyLabel: 'Privacy Policy',
  licensesLabel: 'Licenses',
  helpBody: 'Need assistance with JuanWise? Reach out to your teacher or school administrator, or email our support team and we will get back to you as soon as possible.',
  privacyRightsBody: 'You have the right to access, correct, or request deletion of the personal information collected by JuanWise. Parents and guardians may contact the school administrator to review or manage a student\u2019s data at any time.',
  privacyPreferencesBody: 'Manage how your information is used within JuanWise. Data collected is limited to what is needed to operate the app and track learning progress, and is never shared for advertising purposes.',
  comingSoonBody: 'This section is coming soon.',
  logOutConfirmTitle: 'Log Out',
  logOutConfirmMsg: 'Are you sure you want to log out?',
  cancelBtn: 'Cancel',
  saveBtn: 'Save',
  profileUpdatedTitle: 'Profile Updated',
  profileUpdatedMsg: 'Your changes have been saved.',
  passwordResetPrompt:
    'We will email a secure reset link to {email}. Open it, choose a new password, then sign in again.',
  fieldLockedHint: 'Set when you registered — ask an admin to change it.',
  gradeSectionLabel: 'Grade & Section',
  requiredFieldTitle: 'Required Field',
  requiredFieldMsg: 'Please fill in all fields before saving.',
  totalPointsLabel: 'Total Points',
  lastPointsLabel: 'Last Points (with Timer)',
  noActivityYet: 'No completed activity yet.',
  photoPermissionTitle: 'Permission Needed',
  photoPermissionMsg: 'Please allow access to your photo library to upload a profile photo.',
  profilePhotoTitle: 'Profile Photo',
  uploadFromGalleryBtn: 'Upload from Gallery',
  orChooseAvatarLabel: 'OR CHOOSE AN AVATAR',
  removePhotoBtn: 'Remove Photo',
  lrnHint: '12-digit number only',
  fullNameHint: 'First and last name',
  gradeHint: 'Numbers only',
  gmailHint: 'Must end with @gmail.com',
  depedGmailHint: 'Must end with @deped.gov.ph, @gmail.com or @yopmail.com',
  teacherIdHint: '7-digit number only',
  usernameHint: 'No spaces',
  invalidLrnMsg: 'LRN must be exactly 12 digits.',
  invalidFullNameMsg: 'Please enter your first and last name.',
  invalidGradeMsg: 'Grade must be numbers only.',
  invalidGmailMsg: 'Email must end with @gmail.com.',
  invalidDepedGmailMsg: 'Teacher email must end with @deped.gov.ph, @gmail.com or @yopmail.com.',
  invalidTeacherIdMsg: 'Teacher ID must be exactly 7 digits.',
  invalidUsernameMsg: 'Username cannot contain spaces.',
  invalidPasswordMsg: 'Password does not meet all requirements.',
  pwMinChars: 'Minimum of 8 characters',
  pwLowercase: 'At least 1 lowercase letter (a-z)',
  pwUppercase: 'At least 1 uppercase letter (A-Z)',
  pwNumber: 'At least 1 number',
  pwSpecial: 'At least 1 special character (e.g. ! @ # $ %)',

  paceFast: 'Fast learner',
  paceSteady: 'Steady',
  paceNeedsSupport: 'Needs support',

  trophyGuide: 'Trophy Guide',
  clearBoardTitle: 'Clear the leaderboard?',
  clearBoardMsg: 'This erases every recorded result for this class.',
  clearAllData: 'Clear All Data',
  allFilter: 'All',
  filterTopic: 'All topics',
  filterType: 'All types',
  filterLevel: 'All levels',
  topicLabel: 'Topic',
  activityTypeLabel: 'Activity Type',
  activitiesCompleted: 'activities completed',
  clearSuccessTitle: 'Done',
  clearFailTitle: 'Not Cleared',
  trophyGuideIntro: 'How to earn a Trophy (Combined Quiz & Jigsaw, no filter)',
  legendPointsAndTime: '{points}+ pts · ≤ {time}',
  trophyMaxPossible:
    'Max possible: {points} pts in {seconds} sec. Trophy only appears when "All" is the filter for Topic, Activity Type, and Level.',
  trophyPaceTitle: 'Trophy = Pace (same basis)',
  legendBronzeOrNone: 'Bronze / None',
  starsExplain:
    'Stars = average stars earned per activity (3 stars = fastest/correct, 1 star = passed only, 0 stars = wrong/timeout).',
  sortFastest: 'Top Performers',
  sortHighestPoints: 'Highest Points',
  loadingResults: 'Loading...',
  noResultsForFilter: 'No students have completed an activity under the selected filter yet.',
  totalTimeSuffix: 'total',
  activityTimeoutStat: '{attempts} activities · {timeouts} timeouts',
  quizCorrectStat: 'Quiz: {correct}/30 correct',

  // --- App chrome / bottom navigation ---
  navHome: 'Home',
  navLearn: 'Learn',
  navRanks: 'Ranks',
  navMe: 'Me',
  backA11y: 'Back',
  loading: 'Loading...',
  splashLoading: '★ Loading... ★',
  closeBtn: 'Close',
  goToCategories: 'Go to Categories',
  editBtn: 'Edit',
  deleteBtn: 'Delete',
  removeBtn: 'Remove',
  okBtn: 'OK',
  appTagline: 'Gamified Philippine Knowledge',

  // --- Welcome screen ---
  welcomeIntro: 'Welcome! Come on, let\'s get to know JuanWise',
  welcomeAudience: 'Students · Teachers · Schools · Araling Panlipunan',
  welcomeForStudents: 'FOR STUDENTS',
  welcomeStudentBlurb: 'You are the player here! Enjoy the quizzes and jigsaw puzzles while you learn about the history, culture, and geography of our beloved Philippines.',
  welcomeForTeachers: 'FOR TEACHERS / ADMIN',
  welcomeTeacherBlurb: 'As a teacher or admin, you guide the students through JuanWise — a supplementary tool that makes teaching more fun and effective.',
  welcomeCta: 'Alright, let\'s go!',
  welcomePrivacyBody: 'JuanWise only collects what it needs to run the app and track learning progress — name, grade level, and activity results.\n\nThe progress dashboard and performance data are visible only to the student, their parent/guardian, and authorized teachers. They are never sold or shared with anyone else.\n\nFor the full details, see the Terms and Conditions.',
  welcomeAboutBody: 'JuanWise is a gamified supplementary learning tool that teaches Philippine history, culture, and geography through quizzes and jigsaw puzzles.\n\nStudents move through 5 levels per category, earning points, stars, and trophies at every step. Teachers get a live leaderboard and progress dashboard to follow the class.',

  // --- Coming soon ---
  comingSoonTitle: 'Coming Soon',
  comingSoonSubtitle: 'This is still being built. Check back later!',

  // --- Level map ---
  categoryLabel: 'Category',
  jigsawPuzzleMode: 'Jigsaw Puzzle Mode',
  quizMode: 'Quiz Mode',
  trophyCaps: 'TROPHY',
  youAreHere: 'YOU ARE HERE',
  levelNum: 'Level {n}',
  continueLevel: 'Continue Level {n}',

  // --- Activity list ---
  jigsawPiecesMeta: 'Jigsaw · {count} pieces',
  miniLessonQuizMeta: 'Mini lesson · Quiz',
  levelCompleteLabel: 'Level complete',
  chooseAnActivity: 'Choose an activity',
  continueActivity: 'Continue Activity {n}',
  completeLevel: 'Complete Level {n}',
  activityNumTitle: 'Activity {num}: {title}',

  // --- Quiz / activity play ---
  typeMultipleChoice: 'Multiple Choice',
  typeIdentification: 'Identification',
  typeEnumeration: 'Enumeration',
  notRecordedTitle: 'Not Recorded',
  notRecordedAnswerMsg: 'Your answer was not recorded. Please try again.',
  notRecordedResultMsg: 'Your result was not recorded. Please try again.',
  fetchingQuestion: 'Fetching the latest question...',
  miniLessonHeading: 'Mini-Lesson',
  startQuestion: 'Start the Question',
  typeYourAnswer: 'Type your answer...',
  submitBtn: 'Submit',
  answerNPlaceholder: 'Answer {n}...',
  submitCompleteAnswer: 'Submit the Complete Answer',
  activityCompleteTitle: 'Activity Complete!',
  starsEarnedLabel: 'Stars Earned:',
  offlineQueuedNote: 'Offline — this result will be sent once you are back online.',
  proceedNextActivity: 'Proceed to Next Activity',
  activityCompleteIncorrect: 'Activity Complete (Incorrect)',
  statusFailedIncorrect: 'Status: Failed / Incorrect (Needs Retry)',
  statusFailedIncomplete: 'Status: Failed / Incomplete (Needs Retry)',
  pointsZero: 'Points: 0 pts',
  proceedOtherActivityAnswer: 'Proceed to other Activity — maybe you can answer it, try it',
  proceedOtherActivityForm: 'Proceed to other Activity — maybe you can form it, try it',

  // --- Jigsaw puzzle ---
  dragPiecesHint: 'Drag the pieces below into the board to complete the picture',
  pictureComplete: 'Picture Complete!',
  learnMoreBtn: 'Learn more',

  // --- Level summary ---
  goldMedal: 'Gold Medal',
  silverMedal: 'Silver Medal',
  bronzeMedal: 'Bronze Medal',
  enumShort: 'Enum',
  classFast: 'Fast Learner',
  classModerate: 'Moderate Learner',
  classSlow: 'Slow Learner',
  levelDashLabel: 'Level {level} — {label}',
  studentNameLine: 'Student: {name}',
  summaryWord: 'Summary',
  completeWord: 'Complete',
  pointsOutOf: 'Points / {max}',
  learnerClassification: 'Learner Classification',
  perActivityResults: 'Per-Activity Results',
  jigsawPcs: 'Jigsaw ({n} pcs)',
  passedWithCount: 'Passed ({correct}/{required})',
  passedWord: 'Passed',
  retryWord: 'Retry',
  backToSummary: 'Back to Summary',
  proceedNextLevelUnlock: 'Proceed to Next Level (Unlock Level {n})',
  proceedToLevelMap: 'Proceed to Level Map',

  // --- Mini-lessons and results screens ---
  miniLessonsTitle: 'Mini-Lessons',
  quizResultsTitle: 'Quiz Results',
  jigsawResultsTitle: 'Jigsaw Puzzle Results',

  // --- Student leaderboard ---
  topRankLabel: 'Top',
  noTrophyLabel: 'no trophy',
  trophyGuideIntroNoFilter: 'How to earn a Trophy (Combined Quiz & Jigsaw)',
  starsExplainShort: 'Stars = average stars earned per activity',
  myRankLine: 'Your rank: #{rank}. Tap for your full record.',
  onlyOneWithResults: 'You are the only one with results so far!',
  beatsPercent: 'You are doing better than {pct}% of the other students!',
  tapForFullRecord: 'Tap for your full record',
  rankEntryA11y: 'Rank {rank}: {name}, {points} points, {trophy}',
  rankEntryPaceA11y: 'Rank {rank}: {name}, {points} points, {trophy}, {pace}',
  noActivityYetStudent: 'No completed activity yet. Answer a Quiz or Jigsaw Puzzle to show up here.',
  allOnPodium: 'Everyone with a result is already on the podium.',
  trophyWord: 'Trophy',
  tapAnywhereToClose: 'Tap anywhere to close',

  // --- Student summary ---
  fullRecordTitle: 'Full Record — Summary and History of Every Activity',
  activitiesDoneLabel: 'Activities Done',
  totalTimeLabel: 'Total Time',
  noActivityForStudent: 'This student has not completed an activity yet.',
  timeoutLabel: 'Timeout',
  noActivityShort: 'No activity yet',

  // --- Performance progression ---
  trendImproving: 'Improving',
  trendSteady: 'Steady',
  trendNeedsHelp: 'Needs support',
  trendNotEnoughData: 'Not enough data',
  trendNotJoined: 'Not joined yet',
  statPoints: '★ Points',
  statSpeed: '⏱ Speed',
  statActivities: 'Activities',
  noStudentsYetPerf: 'No registered students or results yet.',

  // --- Admin — shared ---
  adminNoPackSelected: 'No pack selected. Go back to Activity Management.',
  adminFetchingContent: 'Fetching content from the server...',
  adminPermissionNeeded: 'Permission Needed',
  adminSaveFailedTitle: 'Not Saved',
  adminUploadFailedTitle: 'Not Uploaded',
  adminRestoreFailedTitle: 'Not Restored',
  adminRemoveFailedTitle: 'Not Removed',
  adminSavedTitle: 'Saved!',
  adminEmptyTitle: 'Empty',

  // --- Admin — content manager ---
  contentManagerTitle: 'Content Manager',
  contentManagerSubtitle: 'Editing: {name}',
  miniLessonBeforeQuiz: 'Mini-Lesson before the Quiz',
  customBadge: 'Custom',
  defaultBadge: 'Default',
  removeCustomQuestionTitle: 'Remove the Custom Question?',
  removeCustomQuestionMsg: 'This will revert to the default question for Activity {num}.',

  // --- Admin — jigsaw content ---
  jigsawContentTitle: 'Jigsaw Pictures & Mini-Lessons',
  jigsawContentSubtitle: 'Choose the puzzle picture and edit the mini-lesson for each category',
  photoPermissionPuzzleMsg: 'Allow the app to access your photos so you can choose a puzzle picture.',
  emptyMiniLessonMsg: 'Enter the text for the mini-lesson.',
  changePictureBtn: 'Change Picture',
  restoreDefaultBtn: 'Restore Default',
  typeMiniLesson: 'Type the mini-lesson...',
  editMiniLessonBtn: '✎ Edit the Mini-Lesson',

  // --- Admin — pack list ---
  packDraft: 'Draft',
  packLive: 'Live',
  packArchived: 'Archived',
  packListSubtitle: 'Create, copy, or publish your Activity Management',
  packLoadFailedMsg: 'Could not load Activity Management.',
  packFetching: 'Fetching the packs from the server...',
  newPackBtn: 'New Pack',
  packNamePlaceholder: 'Pack name...',
  packNameRequiredMsg: 'Enter a name for the new pack.',
  createBtn: 'Create',
  packCreateFailedTitle: 'Not Created',
  packCreateFailedMsg: 'Could not create the new pack.',
  packCopyFailedTitle: 'Not Copied',
  packCopyFailedMsg: 'Could not copy the pack.',
  packPublishFailedTitle: 'Not Published',
  packPublishFailedMsg: 'Could not publish the pack.',
  packArchiveFailedTitle: 'Not Archived',
  packArchiveFailedMsg: 'Could not archive the pack.',
  packUsedByClasses: 'Used by {count} classes',
  packUsedByNone: 'Not in use',
  editQuizBtn: 'Edit the Quiz',
  editJigsawBtn: 'Edit the Jigsaw',
  publishBtn: 'Publish',
  archiveBtn: 'Archive',

  // --- Admin — question editor ---
  questionTypeLabel: 'Question Type',
  miniLessonHintLabel: 'Mini-Lesson / Hint',
  miniLessonHintPlaceholder: 'Short explanation before the question...',
  questionLabel: 'Question',
  questionPlaceholder: 'Type the question...',
  choicesLabel: 'Choices',
  choicePlaceholder: 'Choice {n}',
  requiredAnswersLabel: 'How Many Answers the Player Must Give (Required Answers)',
  requiredAnswersPlaceholder: 'e.g. 3',
  poolAnswerPlaceholder: 'Pool answer {n}',
  addPoolAnswerBtn: '+ Add a Pool Answer',
  correctAnswerLabel: 'Correct Answer',
  correctAnswerPlaceholder: 'Correct answer...',
  otherAcceptedLabel: 'Other Accepted Answers',
  otherAcceptedPlaceholder: 'Other answer {n}',
  addAcceptedBtn: '+ Add an Accepted Answer',
  explanationLabel: 'Explanation (after the correct answer)',
  explanationPlaceholder: 'Why the answer is correct...',
  lessonImageLabel: 'Lesson Picture',
  choosePictureBtn: 'Choose a Picture',
  photoPermissionLessonMsg: 'Allow the app to access your photos so you can choose a lesson picture.',
  minPoolTitle: 'Minimum Count',
  minPoolMsg: 'At least {min} possible answers are needed in the pool.',
  tooManyTitle: 'Too Many',
  tooManyAcceptedMsg: 'The maximum is {max} accepted answers.',
  switchTypeTitle: 'Switch to {type}?',
  switchTypeMsg: 'The question, hint, explanation, and mini-lesson stay. The answers for the current type ({type}) will be cleared. Nothing is saved until you tap Save the Question.',
  switchAndClearBtn: 'Switch and Clear',
  saveQuestionBtn: 'Save the Question',
  needLessonAndQuestionMsg: 'A mini-lesson and a question are required.',
  needCorrectAnswerMsg: 'A correct answer is required.',
  needChoicesTitle: 'Not Enough Choices',
  needChoicesMsg: 'Enter at least 2 choices.',
  mismatchTitle: 'No Match',
  mismatchMsg: 'The correct answer must be one of the choices.',
  poolTooSmallTitle: 'Answer Pool Too Small',
  poolTooSmallMsg: 'At least {min} (distinct) possible answers are needed. There are only {count} so far.',
  invalidTitle: 'Invalid',
  invalidRequiredMsg: 'Enter how many answers the player must give (at least 1).',
  requiredExceedsPoolMsg: 'The required answers ({required}) cannot exceed the size of the answer pool ({pool}).',
  clearFieldA11y: 'Clear the field',

  // --- Context alerts ---
  packLoadErrorMsg: 'Could not load this pack from the server.',
  questionUpdatedMsg: 'The question was updated for every student.',
  questionSaveFailedMsg: 'The question was not saved.',
  questionRevertedMsg: 'Reverted to the default question.',
  questionRemoveFailedMsg: 'The custom question was not removed.',
  puzzleImageUpdatedMsg: 'The puzzle picture was updated.',
  imageUploadFailedMsg: 'The picture was not uploaded.',
  miniLessonSavedMsg: 'The mini-lesson was saved.',
  miniLessonSaveFailedMsg: 'The mini-lesson was not saved.',
  defaultImageRestoredMsg: 'The default picture was restored.',
  imageRestoreFailedMsg: 'The picture was not restored.',
  imageUploadedMsg: 'The picture was uploaded.',
  settingSavedMsg: 'The setting was saved.',
  settingSaveFailedMsg: 'The setting was not saved.',
  profileRefreshFailedMsg: 'Could not refresh your profile.',
  noEmailOnFileMsg: 'No email address on file for this account.',
  contentLoadFailedMsg: 'Could not load content from the server.',
  resultsLoadFailedMsg: 'Could not load results.',
  noClassSelectedMsg: 'No class selected.',
  resultsDeletedMsg: '{count} results were deleted.',
  resultsDeleteFailedMsg: 'The results were not deleted.',
  classLoadFailedMsg: 'Could not load your class.',
  classCodeGeneratedMsg: 'The class code was generated.',
  classCodeGenerateFailedMsg: 'Could not generate the class code.',
  classCodeFormatMsg: 'The class code must be 10 characters (letters and numbers only).',
  classCodeSavedMsg: 'The class code was saved.',
  classCodeSaveFailedMsg: 'The class code was not saved.',
  classCodeInvalidMsg: 'Wrong class code. Please check it and try again.',
  classJoinFailedMsg: 'Could not join the class.',
  noClassYetMsg: 'No class yet.',
  studentRemovedMsg: 'The student was removed from the roster.',
  studentRemoveFailedMsg: 'The student was not removed.',
  registerIncompleteMsg: 'Registration could not be completed.',
  classCodeShareMsg: 'JuanWise Class Code: {code}',

  // --- Network / API errors ---
  errGeneric: 'Something went wrong. Please try again.',
  errRequestFailed: 'Request failed ({status}).',
  errTimeout: 'The server took too long to respond. Check your connection and try again.',
  errNetwork: 'Could not reach the JuanWise server. Check your internet connection.',
  errUnauthenticated: 'You are signed out. Please sign in again.',
  errUploadFailed: 'The image could not be uploaded. Please try again.',

  // --- Level map extras ---
  doneOfSix: '{done} of 6 done',

  // --- Activity list extras ---
  picturePuzzleTitle: '{label} Picture Puzzle',
  doneOfSixShort: '{done} of 6',
  triesLeftOne: '1 try left',
  triesLeftMany: '{n} tries left',
  outOfTries: 'No tries left',
  tryWordOne: 'try',
  tryWordMany: 'tries',
  triesLeftAfterFail: 'You have {n} more {tries} for this activity.',
  activityFinishedNoTries: 'You used all 3 tries. The next activity is open.',
  activityNumShort: 'Activity {num}',
  activityPlaySubtitle: '{type} · {difficulty} · Activity {num}',
  levelSubtitle: '{label} · {mode}',

  // --- Result sheet detail lines ---
  detailStudent: 'Student: {name}',
  detailTime: 'Time: {time}',
  detailPoints: 'Points: {points} pts',
  detailAnswersCorrect: 'Answers: {correct}/{required} correct',
  detailCategory: 'Category: {label}',
  detailActivityTypeQuiz: 'Activity Type: Quiz ({type})',
  detailActivityTypeJigsaw: 'Activity Type: Jigsaw Puzzle',
  detailActivityCount: 'Activity #: {num} of 6 · Level {level}/5',
  enumHelper: 'Fill in the {required} boxes below ({filled}/{required} filled)',
  headerLevelTitle: '{label} — Level {level}',
  detailPieces: 'Pieces: {count}',
  detailDifficulty: 'Difficulty: {difficulty}',

  // --- Jigsaw detail lines ---
  detailActivityTypeJigsawPieces: 'Activity Type: Jigsaw Puzzle ({count} pieces)',

  // --- Level summary extras ---
  noMedalYet: '— No Medal Yet',
  pointsOutOfNinety: '{points} / 90 points',
  ofSeconds: 'of {seconds}s',
  firstAttemptStat: '1st-Attempt',
  firstAttemptBreakdown: 'First-Attempt Correct: {correct}/6 · Wrong: {wrong}/6',
  typeMC: 'MC',
  typeID: 'ID',
  pointsSuffixShort: '{points} pts',
  incompleteLevelWarning: 'Some activities have no recorded result for this student yet. Go back to the Activity List to finish them.',

  // --- Mini-lessons and results lists ---
  miniLessonsSubtitle: '{count} lessons unlocked from your correct answers in Quiz and Jigsaw Puzzle',
  noMiniLessonsYet: 'You have not unlocked a mini-lesson yet. Answer a Quiz or Jigsaw Puzzle correctly in Categories to unlock a lesson here.',
  levelActivityLine: 'Level {level} · Activity {num}',
  quizResultsSubtitle: '{count} correct answers · {points} total points',
  jigsawResultsSubtitle: '{count} puzzles solved · {points} total points',
  noQuizResultsYet: 'You have not finished a Quiz yet. Go to Categories and try a Quiz activity to see your results here.',
  noJigsawResultsYet: 'You have not finished a Jigsaw Puzzle yet. Go to Categories and solve a puzzle to see your results here.',
  secondsSuffix: '{seconds}s',

  // --- Student leaderboard extras ---
  leaderboardSubtitle: '{count} students with results',
  youSuffix: ' (You)',
  trophyOfTier: '{tier} trophy',
  legendMaxPossible: 'Max possible: {points} pts in {seconds} sec (Quiz + Jigsaw, all levels)',
  rowStatsLine: '{points} pts · {time} · {attempts} activities',
  legendPointsTimeLabel: '{points}+ pts · {time}',

  // --- Student summary extras ---
  avgSuffix: '({avg} avg)',
  viewSummaryToggle: 'Summary (Category/Level)',
  viewHistoryToggle: 'History (All Activities)',
  historyRowLine: 'Level {level} · Activity {num} · {date}',
  categoryTotalsLine: '{points} pts · {attempts} activities',
  passedOfSix: '{passed}/6',

  // --- Performance progression extras ---
  performanceSubtitle: 'Compares the earliest answers against the most recent ones to show who is improving.',
  levelChipShort: 'Lvl {n}',
  noAttemptsInCategory: 'No activities answered yet in {category}.',
  noAttemptsAtAll: 'No activities answered yet.',

  // --- Admin content manager extras ---
  answerLabelShort: 'Answer: {answer}',
  miniLessonToggleDesc: 'When ON, students see the mini-lesson before answering each question.',
  miniLessonToggleNote: 'Note: this currently affects only the Global Library — students using another pack do not see it yet.',

  // --- Pack list extras ---
  packVersionMeta: 'v{version} · {usage}',

  // --- Question editor extras ---
  questionEditorTitle: '{label} — Level {level}, Activity {num}',
  requiredAnswersNote: 'This becomes the number of "tabs" / input boxes the player sees. It must not exceed the size of the Answer Pool below.',
  answerPoolLabel: 'Answer Pool (min. {min} possible answers)',
  poolFilledCount: '{count} filled',
  acceptedCount: '{count}/{max}',
  acceptedAnswersNote: 'Optional. Other ways of writing the same answer (e.g. a different spelling) that will also count as correct.',
  lessonImageNote: 'This shows up in Mini-Lessons once the student finishes the activity. It never appears while the question is being answered, so it cannot give the answer away.',
  noLessonImage: 'No picture — the category\'s default picture will be used.',

  // --- Settings language switcher ---
  languageLabel: 'Language',
};

export type TranslationKey = keyof typeof en;

// Annotated, so a key present in `en` and missing here is a compile error
// rather than a silent English fallback at runtime.
const tl: Record<TranslationKey, string> = {
  chooseLanguage: 'PUMILI NG WIKA',
  tagalog: 'TAGALOG',
  english: 'ENGLISH',

  loginTitle: 'MAG-LOGIN',
  studentAcc: 'ACCOUNT NG ESTUDYANTE',
  teacherAcc: 'ACCOUNT NG GURO',
  username: 'Username',
  password: 'Password',
  forgotPassword: 'Nakalimutan ang Password?',
  loginBtn: 'MAG-LOGIN',
  noAccount: 'Wala ka pang account?',
  signUp: 'Mag-rehistro',
  missingInfo: 'Kulang na Impormasyon',
  enterUsernamePass: 'Pakilagay ang username at password.',

  registerTitle: 'MAGREHISTRO',
  student: 'ESTUDYANTE',
  teacher: 'GURO',
  lrn: 'LRN',
  fullName: 'Buong Pangalan',
  age: 'Edad',
  grade: 'Baitang',
  section: 'Seksyon',
  email: 'Email',
  teacherId: 'Teacher ID',
  handleGrade: 'Hinahawakang Baitang',
  depedGmail: 'Email ng Guro',
  registerBtn: 'MAGREHISTRO',
  haveAccount: 'May account ka na?',
  signIn: 'Mag-sign in',
  registerSuccess: 'Tagumpay',
  registerSuccessMsg: 'Narehistro ang account! Puwede ka nang mag-login.',
  fillUsernamePass: 'Pakilagay ang username at password.',
  noAccountFound: 'Walang Nakitang Account',
  noAccountFoundMsg: 'Wala pang narehistrong account. Mag-rehistro muna.',
  wrongAccountType: 'Maling Klase ng Account',
  wrongAccountTypeMsg: 'Ang account na ito ay hindi narehistro sa napiling tab. Pumili ng tamang klase ng account.',
  invalidLogin: 'Maling Login',
  invalidLoginMsg: 'Mali ang username o password.',

  forgotStudentTitle: 'GMAIL NG ACCOUNT NG ESTUDYANTE (recovery)',
  forgotTeacherTitle: 'EMAIL NG GURO (recovery)',
  studentGmailLabel: 'Nakarehistrong Gmail',
  teacherGmailLabel: 'Nakarehistrong Email ng Guro',
  step1Title: 'I-reset ang iyong password',
  step1Desc: 'Ilagay ang iyong {email}. Padadalhan ka namin ng ligtas na link para makapagpalit ng password.',
  sendOtpBtn: 'Ipadala ang Reset Link',
  step5Title: 'TINGNAN ANG IYONG EMAIL',
  resetSuccessMsg:
    'Kung nakarehistro ang address na iyon, may padalang reset link. Buksan ito sa device na ito, pumili ng bagong password, at bumalik dito para mag-login.',
  resetEmailNote: 'May expiry ang link — humiling ulit kung nag-expire na.',
  backToLogin: 'Bumalik sa Login',
  backLink: '← Bumalik sa Login',

  coins: 'Coins',
  points: 'Puntos',
  categories: 'MGA KATEGORYA',
  miniLessons: 'MAIKLING ARALIN',
  quiz: 'PAGSUSULIT',
  jigsawPuzzle: 'JIGSAW PUZZLE',
  leaderboard: 'TALAAN NG NANGUNGUNA',

  teacherEdition: 'Edisyon ng Guro',
  classOverview: 'Buod ng Klase',
  leaderBoard: 'Talaan ng Nangunguna',
  classContent: 'Nilalaman ng Klase',
  performanceProgression: 'Progreso ng Performance',
  profileSettings: 'SETTINGS NG PROFILE',
  gradeLabel: 'Baitang',
  totalStudents: 'Kabuuang Estudyante',

  classCodeLabel: 'Class Code',
  generateCode: 'Gumawa ng Code',
  editCode: 'Baguhin',
  saveCode: 'I-save',
  cancelCode: 'Kanselahin',
  copyCode: 'Kopyahin',
  codeCopied: 'Nakopya ang class code!',
  invalidClassCode: 'Maling Class Code',
  joinedStudents: 'Mga Sumaling Estudyante',
  noStudentsYet: 'Wala pang sumasaling estudyante. Ibahagi ang class code.',
  removeStudentTitle: 'Alisin sa Klase?',
  removeStudentMsg: 'Aalisin si {name} sa roster. Mananatili ang mga naitala niyang resulta.',
  removeStudentBtn: 'Alisin',
  lrnShort: 'LRN',
  gmailShort: 'Gmail',
  enterCode: 'Ilagay ang Class Code',
  enrolledStatus: 'Naka-enroll na ✓',

  gameTypeQuiz: 'Quiz',
  gameTypeJigsaw: 'Jigsaw Puzzle',
  quizContentBtn: 'Nilalaman ng Quiz',
  jigsawContentBtn: 'Mga Larawan at Aralin ng Jigsaw',
  contentManagementTitle: 'Pamamahala ng Nilalaman',
  contentPackCardTitle: 'Pamamahala ng Aktibidad',
  contentPackNoneAssigned: 'Walang naka-assign na pack — ginagamit ang starter set',
  contentPackStudentsDesc: 'Maglalaro ang mga estudyante ng quiz at jigsaw puzzle mula sa pack na ito sa halip na ang starter set.',
  contentPackChangeBtn: 'Palitan ang Pack',
  contentPackClearBtn: 'I-clear',
  contentPackBoundLinked: 'Shared',
  contentPackBoundCopied: 'Sarili mong kopya',
  managePacksBtn: 'Pamamahala ng Aktibidad',
  assignPackDialogTitle: 'Buksan ang Pamamahala ng Aktibidad',
  assignPackShareBtn: 'Ibahagi',
  assignPackCopyBtn: 'Gumawa ng Kopya',
  assignPackLoadErrorTitle: 'Hindi Na-load',
  assignPackAssignErrorTitle: 'Hindi Na-assign',
  contentPackNoClassMsg: 'Wala pang klase.',
  contentPackAssignedMsg: 'Na-assign ang pack.',
  contentPackAssignFailedMsg: 'Hindi na-assign ang pack.',
  contentPackClearFailedMsg: 'Hindi na-clear ang pack.',

  categoriesTitle: 'MGA KATEGORYA NG KAALAMAN SA PILIPINAS',
  catHistory: 'Kasaysayan',
  catCulture: 'Kultura at Tradisyon',
  catGeography: 'Heograpiya',
  catFestival: 'Pista at Sining',
  catNational: 'Pambansang Sagisag',
  catHeroes: 'Mga Bayaning Pilipino',

  chooseActivity: 'Pumili ng Isang Interactive na Aktibidad',

  levelProgressionMap: 'MAPA NG PROGRESO NG LEVEL',
  level: 'Level',

  completed: 'Tapos na',
  activity: 'Aktibidad',
  pieces: 'piraso',
  shufflePieces: 'Haluin ang piraso',
  backToLevelMap: '← Bumalik sa Mapa ng Level',
  easy: 'Madali',
  normal: 'Normal',
  hard: 'Mahirap',

  successFormed: 'Tama! Nabuo mo ito!',
  continueBtn: 'Magpatuloy',
  time: 'Oras',

  studentAccountTitle: 'Account ng Estudyante',
  teacherAccountTitle: 'Account ng Guro',
  juanWiseTitle: 'JuanWise',
  dashboardHomeTab: 'Home',
  dashboardProfileTab: 'Ako',

  medalGold: 'Ginto',
  medalSilver: 'Pilak',
  medalBronze: 'Tanso',
  timeUsedSuffix: 's na ginamit',
  ptsSuffix: 'puntos',
  timeUpTitle: '⏰ Ubos na ang Oras!',
  timeUpDesc: 'Naubusan ka ng oras bago mabuo ang puzzle. Subukan ulit — 60 segundo bawat pagsubok.',
  tryAgainBtn: 'Subukan Ulit',
  backBtn: '← Bumalik',

  studentProfileTitle: 'Profile Settings ng Estudyante',
  adminProfileTitle: 'Profile Settings ng Admin',
  updateProfileInfoBtn: 'I-UPDATE ANG PROFILE INFO',
  changePasswordBtn: 'PALITAN ANG PASSWORD',
  settingsBtn: 'SETTINGS',
  logOutBtn: 'MAG-LOG OUT',

  settingsTitle: 'Settings',
  soundsLabel: 'Tunog',
  helpLabel: 'Tulong',
  aboutGameLabel: 'Tungkol sa Laro',
  termsConditionsLabel: 'Mga Tuntunin at Kundisyon',
  privacyRightsLabel: 'Karapatan sa Privacy',
  privacyPreferencesLabel: 'Kagustuhan sa Privacy',
  versionLabel: 'Bersyon',
  copyrightLabel: 'Nakalaan ang lahat ng karapatan.',
  termsOfServiceLabel: 'Mga Tuntunin ng Serbisyo',
  privacyPolicyLabel: 'Patakaran sa Privacy',
  licensesLabel: 'Mga Lisensya',
  helpBody: 'Kailangan ng tulong sa JuanWise? Makipag-ugnayan sa iyong guro o school administrator, o mag-email sa aming support team at sasagutin ka namin sa lalong madaling panahon.',
  privacyRightsBody: 'May karapatan kang ma-access, itama, o hilingin ang pagtanggal ng personal na impormasyong kinokolekta ng JuanWise. Maaaring makipag-ugnayan ang mga magulang o tagapag-alaga sa school administrator para suriin o pamahalaan ang datos ng estudyante anumang oras.',
  privacyPreferencesBody: 'Pamahalaan kung paano ginagamit ang iyong impormasyon sa loob ng JuanWise. Ang nakokolektang datos ay limitado lamang sa kailangan para patakbuhin ang app at subaybayan ang progreso sa pag-aaral, at hindi ito ibinabahagi para sa advertising.',
  comingSoonBody: 'Malapit na ang seksyong ito.',
  logOutConfirmTitle: 'Mag-log Out',
  logOutConfirmMsg: 'Sigurado ka bang gusto mong mag-log out?',
  cancelBtn: 'Kanselahin',
  saveBtn: 'I-save',
  profileUpdatedTitle: 'Na-update ang Profile',
  profileUpdatedMsg: 'Na-save na ang mga pagbabago mo.',
  passwordResetPrompt:
    'Padadalhan ka namin ng reset link sa {email}. Buksan ito, pumili ng bagong password, at mag-login ulit.',
  fieldLockedHint: 'Naitakda noong nagparehistro — kausapin ang admin para mapalitan.',
  gradeSectionLabel: 'Baitang at Seksyon',
  requiredFieldTitle: 'Kailangang Punan',
  requiredFieldMsg: 'Pakipunan ang lahat ng patlang bago i-save.',
  totalPointsLabel: 'Kabuuang Puntos',
  lastPointsLabel: 'Huling Puntos (kasama ang Timer)',
  noActivityYet: 'Wala pang natatapos na gawain.',
  photoPermissionTitle: 'Kailangan ng Pahintulot',
  photoPermissionMsg: 'Pakipayagan ang access sa iyong photo library para makapag-upload ng profile photo.',
  profilePhotoTitle: 'Profile Photo',
  uploadFromGalleryBtn: 'Mag-upload mula sa Gallery',
  orChooseAvatarLabel: 'O PUMILI NG AVATAR',
  removePhotoBtn: 'Alisin ang Photo',
  lrnHint: '12 digit na numero lamang',
  fullNameHint: 'Pangalan at apelyido',
  gradeHint: 'Numero lamang',
  gmailHint: 'Dapat magtapos sa @gmail.com',
  depedGmailHint: 'Dapat magtapos sa @deped.gov.ph, @gmail.com o @yopmail.com',
  teacherIdHint: '7 digit na numero lamang',
  usernameHint: 'Walang space',
  invalidLrnMsg: 'Ang LRN ay dapat eksaktong 12 digits.',
  invalidFullNameMsg: 'Pakilagay ang pangalan at apelyido.',
  invalidGradeMsg: 'Ang grade ay dapat numero lamang.',
  invalidGmailMsg: 'Ang email ay dapat magtapos sa @gmail.com.',
  invalidDepedGmailMsg: 'Ang email ng guro ay dapat magtapos sa @deped.gov.ph, @gmail.com o @yopmail.com.',
  invalidTeacherIdMsg: 'Ang Teacher ID ay dapat eksaktong 7 digits.',
  invalidUsernameMsg: 'Ang username ay hindi puwedeng may space.',
  invalidPasswordMsg: 'Hindi pa naabot ng password ang lahat ng requirements.',
  pwMinChars: 'Minimum na 8 characters',
  pwLowercase: 'Kailangan ng 1 lowercase letter (a-z)',
  pwUppercase: 'Kailangan ng 1 uppercase letter (A-Z)',
  pwNumber: 'Kailangan ng 1 numero',
  pwSpecial: 'Kailangan ng 1 special character (e.g. ! @ # $ %)',

  paceFast: 'Mabilis Matuto',
  paceSteady: 'Sakto sa Bilis',
  paceNeedsSupport: 'Kailangan ng Tulong',

  trophyGuide: 'Gabay sa Tropeo',
  clearBoardTitle: 'I-clear ang Talaan ng Nangunguna?',
  clearBoardMsg: 'Buburahin lahat ng naitalang resulta ng klaseng ito.',
  clearAllData: 'I-clear ang Lahat ng Data',
  allFilter: 'Lahat',
  filterTopic: 'Lahat ng paksa',
  filterType: 'Lahat ng uri',
  filterLevel: 'Lahat ng level',
  topicLabel: 'Kategorya',
  activityTypeLabel: 'Uri ng Gawain',
  activitiesCompleted: 'kabuuang gawaing natapos',
  clearSuccessTitle: 'Tapos na',
  clearFailTitle: 'Hindi Nabura',
  trophyGuideIntro: 'Paano makakuha ng Tropeo (Combined Quiz & Jigsaw, walang filter)',
  legendPointsAndTime: '{points}+ puntos · ≤ {time}',
  trophyMaxPossible:
    'Max posible: {points} puntos sa {seconds} sec. Ang Tropeo ay makikita lamang kapag "Lahat" ang filter sa Kategorya, Uri ng Gawain, at Level.',
  trophyPaceTitle: 'Tropeo = Pace (parehong batayan)',
  legendBronzeOrNone: 'Tanso / Wala',
  starsExplain:
    'Bituin = katamtamang bituin kada gawain (3 bituin pinakamabilis/tama, 1 bituin pumasa lang, 0 bituin mali/timeout).',
  sortFastest: 'Nangungunang Estudyante',
  sortHighestPoints: 'Pinakamataas na Puntos',
  loadingResults: 'Naglo-load...',
  noResultsForFilter: 'Wala pang natatapos na gawain ang mga estudyante sa napiling filter.',
  totalTimeSuffix: 'kabuuan',
  activityTimeoutStat: '{attempts} gawain · {timeouts} timeout',
  quizCorrectStat: 'Quiz: {correct}/30 tama',

  // --- App chrome / bottom navigation ---
  navHome: 'Home',
  navLearn: 'Aral',
  navRanks: 'Ranggo',
  navMe: 'Ako',
  backA11y: 'Bumalik',
  loading: 'Naglo-load...',
  splashLoading: '★ Naglo-load... ★',
  closeBtn: 'Isara',
  goToCategories: 'Pumunta sa Categories',
  editBtn: 'I-edit',
  deleteBtn: 'Burahin',
  removeBtn: 'Alisin',
  okBtn: 'OK',
  appTagline: 'Gamified Philippine Knowledge',

  // --- Welcome screen ---
  welcomeIntro: 'Maligayang pagdating! Tara, kilalanin natin ang JuanWise',
  welcomeAudience: 'Estudyante · Guro · Paaralan · Araling Panlipunan',
  welcomeForStudents: 'PARA SA ESTUDYANTE',
  welcomeStudentBlurb: 'Ikaw ang player dito! Mag-enjoy sa mga quiz at jigsaw puzzle habang natututo ka tungkol sa kasaysayan, kultura, at heograpiya ng ating pinakamamahal na bayang Pilipinas.',
  welcomeForTeachers: 'PARA SA GURO / ADMIN',
  welcomeTeacherBlurb: 'Bilang guro o admin, ikaw ang gagabay sa mga estudyante gamit ang JuanWise — isang supplementary tool para mas masaya at epektibo ang pagtuturo.',
  welcomeCta: 'Sige, tara na!',
  welcomePrivacyBody: 'Kinokolekta lang ng JuanWise ang kailangan para gumana ang app at masubaybayan ang progreso ng pag-aaral — pangalan, grade level, at resulta ng mga activity.\n\nAng progress dashboard at performance data ay makikita lamang ng estudyante mismo, ng kanyang magulang/guardian, at ng mga awtorisadong guro. Hindi ito ibinebenta o ibinabahagi sa ibang tao.\n\nPara sa buong detalye, tingnan ang Terms and Conditions.',
  welcomeAboutBody: 'Ang JuanWise ay isang gamified supplementary learning tool na nagtuturo ng kasaysayan, kultura, at heograpiya ng Pilipinas sa pamamagitan ng quiz at jigsaw puzzle.\n\nDadaan ang mga estudyante sa 5 level bawat kategorya, kumikita ng puntos, bituin, at tropeo sa bawat hakbang. Makikita naman ng mga guro ang live na talaan ng nangunguna at progress dashboard para masubaybayan ang klase.',

  // --- Coming soon ---
  comingSoonTitle: 'Malapit Na',
  comingSoonSubtitle: 'Nasa proseso pa ito ng paggawa. Balik ka na lang mamaya!',

  // --- Level map ---
  categoryLabel: 'Kategorya',
  jigsawPuzzleMode: 'Mode ng Jigsaw Puzzle',
  quizMode: 'Mode ng Quiz',
  trophyCaps: 'TROPEO',
  youAreHere: 'NANDITO KA',
  levelNum: 'Level {n}',
  continueLevel: 'Ituloy ang Level {n}',

  // --- Activity list ---
  jigsawPiecesMeta: 'Jigsaw · {count} piraso',
  miniLessonQuizMeta: 'Maikling aralin · Quiz',
  levelCompleteLabel: 'Tapos na ang level',
  chooseAnActivity: 'Pumili ng aktibidad',
  continueActivity: 'Ituloy ang Aktibidad {n}',
  completeLevel: 'Tapusin ang Level {n}',
  activityNumTitle: 'Aktibidad {num}: {title}',

  // --- Quiz / activity play ---
  typeMultipleChoice: 'Multiple Choice',
  typeIdentification: 'Identification',
  typeEnumeration: 'Enumeration',
  notRecordedTitle: 'Hindi Naitala',
  notRecordedAnswerMsg: 'Hindi naitala ang sagot mo. Subukan ulit.',
  notRecordedResultMsg: 'Hindi naitala ang resulta mo. Subukan ulit.',
  fetchingQuestion: 'Kinukuha ang pinakabagong tanong...',
  miniLessonHeading: 'Maikling Aralin',
  startQuestion: 'Simulan ang Tanong',
  typeYourAnswer: 'I-type ang iyong sagot...',
  submitBtn: 'Isumite',
  answerNPlaceholder: 'Sagot {n}...',
  submitCompleteAnswer: 'Isumite ang Kumpletong Sagot',
  activityCompleteTitle: 'Tapos na ang Aktibidad!',
  starsEarnedLabel: 'Bituing Nakuha:',
  offlineQueuedNote: 'Offline — ipapadala ang resultang ito pagbalik ng internet.',
  proceedNextActivity: 'Tumuloy sa Susunod na Aktibidad',
  activityCompleteIncorrect: 'Tapos na ang Aktibidad (Mali)',
  statusFailedIncorrect: 'Status: Bagsak / Mali (Kailangang Ulitin)',
  statusFailedIncomplete: 'Status: Bagsak / Hindi Tapos (Kailangang Ulitin)',
  pointsZero: 'Puntos: 0',
  proceedOtherActivityAnswer: 'Tumuloy sa ibang Aktibidad — baka masagot mo ito, subukan mo',
  proceedOtherActivityForm: 'Tumuloy sa ibang Aktibidad — baka mabuo mo ito, subukan mo',

  // --- Jigsaw puzzle ---
  dragPiecesHint: 'I-drag ang mga piraso sa ibaba papunta sa board para mabuo ang larawan',
  pictureComplete: 'Kumpleto na ang Larawan!',
  learnMoreBtn: 'Alamin',

  // --- Level summary ---
  goldMedal: 'Gintong Medalya',
  silverMedal: 'Pilak na Medalya',
  bronzeMedal: 'Tansong Medalya',
  enumShort: 'Enum',
  classFast: 'Mabilis Matuto',
  classModerate: 'Katamtamang Matuto',
  classSlow: 'Mabagal Matuto',
  levelDashLabel: 'Level {level} — {label}',
  studentNameLine: 'Estudyante: {name}',
  summaryWord: 'Buod',
  completeWord: 'Tapos',
  pointsOutOf: 'Puntos / {max}',
  learnerClassification: 'Klasipikasyon ng Mag-aaral',
  perActivityResults: 'Resulta Bawat Aktibidad',
  jigsawPcs: 'Jigsaw ({n} piraso)',
  passedWithCount: 'Pasado ({correct}/{required})',
  passedWord: 'Pasado',
  retryWord: 'Ulitin',
  backToSummary: 'Bumalik sa Buod',
  proceedNextLevelUnlock: 'Tumuloy sa Susunod na Level (Buksan ang Level {n})',
  proceedToLevelMap: 'Pumunta sa Mapa ng Level',

  // --- Mini-lessons and results screens ---
  miniLessonsTitle: 'Maiikling Aralin',
  quizResultsTitle: 'Resulta ng Quiz',
  jigsawResultsTitle: 'Resulta ng Jigsaw Puzzle',

  // --- Student leaderboard ---
  topRankLabel: 'Nangunguna',
  noTrophyLabel: 'walang tropeo',
  trophyGuideIntroNoFilter: 'Paano makakuha ng Tropeo (Combined Quiz & Jigsaw)',
  starsExplainShort: 'Bituin = katamtamang bituin kada gawain',
  myRankLine: 'Ranggo mo: pang-{rank}. Tap para sa buong record.',
  onlyOneWithResults: 'Ikaw pa lang ang may resulta sa ngayon!',
  beatsPercent: 'Mas magaling ka kaysa sa {pct}% ng ibang mag-aaral!',
  tapForFullRecord: 'Tap para sa buong record mo',
  rankEntryA11y: 'Pang-{rank}: {name}, {points} puntos, {trophy}',
  rankEntryPaceA11y: 'Pang-{rank}: {name}, {points} puntos, {trophy}, {pace}',
  noActivityYetStudent: 'Wala pang natatapos na gawain. Sagutan ang isang Quiz o Jigsaw Puzzle para lumabas dito.',
  allOnPodium: 'Nasa podium na ang lahat ng may resulta.',
  trophyWord: 'Tropeo',
  tapAnywhereToClose: 'Tap kahit saan para isara',

  // --- Student summary ---
  fullRecordTitle: 'Kompletong Record — Buod at Kasaysayan ng Bawat Gawain',
  activitiesDoneLabel: 'Gawaing Natapos',
  totalTimeLabel: 'Kabuuang Oras',
  noActivityForStudent: 'Wala pang natatapos na gawain ang estudyanteng ito.',
  timeoutLabel: 'Timeout',
  noActivityShort: 'Wala pang gawain',

  // --- Performance progression ---
  trendImproving: 'Umuunlad',
  trendSteady: 'Pantay-pantay',
  trendNeedsHelp: 'Kailangan ng Tulong',
  trendNotEnoughData: 'Kulang ang Datos',
  trendNotJoined: 'Hindi pa Nakasali',
  statPoints: '★ Puntos',
  statSpeed: '⏱ Bilis',
  statActivities: 'Gawain',
  noStudentsYetPerf: 'Wala pang estudyanteng nakarehistro o may resulta.',

  // --- Admin — shared ---
  adminNoPackSelected: 'Walang napiling pack. Bumalik sa Activity Management.',
  adminFetchingContent: 'Kinukuha ang nilalaman mula sa server...',
  adminPermissionNeeded: 'Kailangan ng Pahintulot',
  adminSaveFailedTitle: 'Hindi Na-save',
  adminUploadFailedTitle: 'Hindi Na-upload',
  adminRestoreFailedTitle: 'Hindi Naibalik',
  adminRemoveFailedTitle: 'Hindi Naalis',
  adminSavedTitle: 'Naka-save!',
  adminEmptyTitle: 'Walang Laman',

  // --- Admin — content manager ---
  contentManagerTitle: 'Content Manager',
  contentManagerSubtitle: 'Ini-edit: {name}',
  miniLessonBeforeQuiz: 'Mini-Lesson bago ang Quiz',
  customBadge: 'Custom',
  defaultBadge: 'Default',
  removeCustomQuestionTitle: 'Alisin ang Custom na Tanong?',
  removeCustomQuestionMsg: 'Babalik ito sa default na tanong para sa Activity {num}.',

  // --- Admin — jigsaw content ---
  jigsawContentTitle: 'Jigsaw Pictures & Mini-Lessons',
  jigsawContentSubtitle: 'Piliin ang larawan ng puzzle at i-edit ang mini-lesson bawat kategorya',
  photoPermissionPuzzleMsg: 'Payagan ang app na ma-access ang iyong mga larawan para makapili ng puzzle picture.',
  emptyMiniLessonMsg: 'Maglagay ng teksto para sa mini-lesson.',
  changePictureBtn: 'Palitan ang Larawan',
  restoreDefaultBtn: 'Ibalik sa Default',
  typeMiniLesson: 'I-type ang mini-lesson...',
  editMiniLessonBtn: '✎ I-edit ang Mini-Lesson',

  // --- Admin — pack list ---
  packDraft: 'Draft',
  packLive: 'Live',
  packArchived: 'Archived',
  packListSubtitle: 'Gumawa, kopyahin, o i-publish ang iyong Activity Management',
  packLoadFailedMsg: 'Hindi na-load ang Activity Management.',
  packFetching: 'Kinukuha ang mga pack mula sa server...',
  newPackBtn: 'Bagong Pack',
  packNamePlaceholder: 'Pangalan ng pack...',
  packNameRequiredMsg: 'Maglagay ng pangalan para sa bagong pack.',
  createBtn: 'Gawin',
  packCreateFailedTitle: 'Hindi Nagawa',
  packCreateFailedMsg: 'Hindi nagawa ang bagong pack.',
  packCopyFailedTitle: 'Hindi Nakopya',
  packCopyFailedMsg: 'Hindi nakopya ang pack.',
  packPublishFailedTitle: 'Hindi Na-publish',
  packPublishFailedMsg: 'Hindi na-publish ang pack.',
  packArchiveFailedTitle: 'Hindi Na-archive',
  packArchiveFailedMsg: 'Hindi na-archive ang pack.',
  packUsedByClasses: 'Ginagamit ng {count} klase',
  packUsedByNone: 'Walang gumagamit',
  editQuizBtn: 'I-edit ang Quiz',
  editJigsawBtn: 'I-edit ang Jigsaw',
  publishBtn: 'I-publish',
  archiveBtn: 'I-archive',

  // --- Admin — question editor ---
  questionTypeLabel: 'Uri ng Tanong',
  miniLessonHintLabel: 'Mini-Lesson / Hint',
  miniLessonHintPlaceholder: 'Maikling paliwanag bago ang tanong...',
  questionLabel: 'Tanong',
  questionPlaceholder: 'I-type ang tanong...',
  choicesLabel: 'Mga Choices',
  choicePlaceholder: 'Choice {n}',
  requiredAnswersLabel: 'Ilang Sagot ang Kailangan ng Player (Required Answers)',
  requiredAnswersPlaceholder: 'hal. 3',
  poolAnswerPlaceholder: 'Pool answer {n}',
  addPoolAnswerBtn: '+ Magdagdag ng Pool Answer',
  correctAnswerLabel: 'Tamang Sagot',
  correctAnswerPlaceholder: 'Tamang sagot...',
  otherAcceptedLabel: 'Iba pang Tinatanggap na Sagot',
  otherAcceptedPlaceholder: 'Ibang sagot {n}',
  addAcceptedBtn: '+ Magdagdag ng Tinatanggap na Sagot',
  explanationLabel: 'Paliwanag (pagkatapos ng tamang sagot)',
  explanationPlaceholder: 'Bakit tama ang sagot...',
  lessonImageLabel: 'Larawan ng Aralin',
  choosePictureBtn: 'Pumili ng Larawan',
  photoPermissionLessonMsg: 'Payagan ang app na ma-access ang iyong mga larawan para makapili ng larawan sa aralin.',
  minPoolTitle: 'Minimum na Bilang',
  minPoolMsg: 'Kailangan ng hindi bababa sa {min} na posibleng sagot sa pool.',
  tooManyTitle: 'Sobra Na',
  tooManyAcceptedMsg: 'Pinakamarami ay {max} na tinatanggap na sagot.',
  switchTypeTitle: 'Palitan sa {type}?',
  switchTypeMsg: 'Mananatili ang tanong, hint, paliwanag, at mini-lesson. Mabubura ang mga sagot ng kasalukuyang uri ({type}). Wala pang na-se-save hangga\'t hindi mo pinipindot ang I-save ang Tanong.',
  switchAndClearBtn: 'Palitan at Burahin',
  saveQuestionBtn: 'I-save ang Tanong',
  needLessonAndQuestionMsg: 'Kailangan ng mini-lesson at tanong.',
  needCorrectAnswerMsg: 'Kailangan ng tamang sagot.',
  needChoicesTitle: 'Kulang na Choices',
  needChoicesMsg: 'Maglagay ng hindi bababa sa 2 choices.',
  mismatchTitle: 'Hindi Tugma',
  mismatchMsg: 'Ang tamang sagot ay dapat isa sa mga choices.',
  poolTooSmallTitle: 'Kulang ang Answer Pool',
  poolTooSmallMsg: 'Kailangan ng hindi bababa sa {min} (natatanging) posibleng sagot. Meron pa lang {count}.',
  invalidTitle: 'Hindi Wasto',
  invalidRequiredMsg: 'Ilagay kung ilang sagot ang kailangang isagot ng player (hindi bababa sa 1).',
  requiredExceedsPoolMsg: 'Ang kailangang sagot ({required}) ay hindi maaaring lumampas sa laki ng answer pool ({pool}).',
  clearFieldA11y: 'I-clear ang field',

  // --- Context alerts ---
  packLoadErrorMsg: 'Hindi na-load ang pack na ito mula sa server.',
  questionUpdatedMsg: 'Na-update ang tanong para sa lahat ng mag-aaral.',
  questionSaveFailedMsg: 'Hindi na-save ang tanong.',
  questionRevertedMsg: 'Naibalik sa default na tanong.',
  questionRemoveFailedMsg: 'Hindi naalis ang custom na tanong.',
  puzzleImageUpdatedMsg: 'Na-update ang larawan ng puzzle.',
  imageUploadFailedMsg: 'Hindi na-upload ang larawan.',
  miniLessonSavedMsg: 'Na-save ang mini-lesson.',
  miniLessonSaveFailedMsg: 'Hindi na-save ang mini-lesson.',
  defaultImageRestoredMsg: 'Naibalik ang default na larawan.',
  imageRestoreFailedMsg: 'Hindi naibalik ang larawan.',
  imageUploadedMsg: 'Na-upload ang larawan.',
  settingSavedMsg: 'Na-save ang setting.',
  settingSaveFailedMsg: 'Hindi na-save ang setting.',
  profileRefreshFailedMsg: 'Hindi na-refresh ang profile mo.',
  noEmailOnFileMsg: 'Walang nakatalang email address para sa account na ito.',
  contentLoadFailedMsg: 'Hindi na-load ang nilalaman mula sa server.',
  resultsLoadFailedMsg: 'Hindi na-load ang mga resulta.',
  noClassSelectedMsg: 'Walang klaseng napili.',
  resultsDeletedMsg: 'Nabura ang {count} na resulta.',
  resultsDeleteFailedMsg: 'Hindi nabura ang mga resulta.',
  classLoadFailedMsg: 'Hindi na-load ang klase mo.',
  classCodeGeneratedMsg: 'Na-generate ang class code.',
  classCodeGenerateFailedMsg: 'Hindi na-generate ang class code.',
  classCodeFormatMsg: 'Ang class code ay dapat 10 characters (letters at numbers lang).',
  classCodeSavedMsg: 'Na-save ang class code.',
  classCodeSaveFailedMsg: 'Hindi na-save ang class code.',
  classCodeInvalidMsg: 'Maling class code. Pakisuri at subukan ulit.',
  classJoinFailedMsg: 'Hindi nakasali sa klase.',
  noClassYetMsg: 'Wala pang klase.',
  studentRemovedMsg: 'Naalis ang mag-aaral sa roster.',
  studentRemoveFailedMsg: 'Hindi naalis ang mag-aaral.',
  registerIncompleteMsg: 'Hindi nakumpleto ang pagpaparehistro.',
  classCodeShareMsg: 'JuanWise Class Code: {code}',

  // --- Network / API errors ---
  errGeneric: 'May nangyaring mali. Subukan ulit.',
  errRequestFailed: 'Nabigo ang request ({status}).',
  errTimeout: 'Masyadong matagal sumagot ang server. Suriin ang koneksyon mo at subukan ulit.',
  errNetwork: 'Hindi maabot ang JuanWise server. Suriin ang koneksyon mo sa internet.',
  errUnauthenticated: 'Naka-sign out ka na. Mag-sign in ulit.',
  errUploadFailed: 'Hindi na-upload ang larawan. Subukan ulit.',

  // --- Level map extras ---
  doneOfSix: '{done} sa 6 tapos na',

  // --- Activity list extras ---
  picturePuzzleTitle: 'Picture Puzzle ng {label}',
  doneOfSixShort: '{done} sa 6',
  triesLeftOne: '1 subok na lang',
  triesLeftMany: '{n} subok pa',
  outOfTries: 'Wala nang subok',
  tryWordOne: 'subok',
  tryWordMany: 'subok',
  triesLeftAfterFail: 'May {n} {tries} ka pa sa aktibidad na ito.',
  activityFinishedNoTries: 'Nagamit mo na ang 3 subok. Bukas na ang susunod na aktibidad.',
  activityNumShort: 'Aktibidad {num}',
  activityPlaySubtitle: '{type} · {difficulty} · Aktibidad {num}',
  levelSubtitle: '{label} · {mode}',

  // --- Result sheet detail lines ---
  detailStudent: 'Estudyante: {name}',
  detailTime: 'Oras: {time}',
  detailPoints: 'Puntos: {points}',
  detailAnswersCorrect: 'Sagot: {correct}/{required} tama',
  detailCategory: 'Kategorya: {label}',
  detailActivityTypeQuiz: 'Uri ng Gawain: Quiz ({type})',
  detailActivityTypeJigsaw: 'Uri ng Gawain: Jigsaw Puzzle',
  detailActivityCount: 'Aktibidad #: {num} sa 6 · Level {level}/5',
  enumHelper: 'Punuan ang {required} kahon sa ibaba ({filled}/{required} napunuan)',
  headerLevelTitle: '{label} — Level {level}',
  detailPieces: 'Piraso: {count}',
  detailDifficulty: 'Hirap: {difficulty}',

  // --- Jigsaw detail lines ---
  detailActivityTypeJigsawPieces: 'Uri ng Gawain: Jigsaw Puzzle ({count} piraso)',

  // --- Level summary extras ---
  noMedalYet: '— Walang Medal Pa',
  pointsOutOfNinety: '{points} / 90 puntos',
  ofSeconds: 'sa {seconds}s',
  firstAttemptStat: 'Unang Subok',
  firstAttemptBreakdown: 'Tamang Unang Subok: {correct}/6 · Mali: {wrong}/6',
  typeMC: 'MC',
  typeID: 'ID',
  pointsSuffixShort: '{points} puntos',
  incompleteLevelWarning: 'May mga aktibidad na wala pang naitalang resulta para sa estudyanteng ito. Bumalik sa Activity List para makumpleto.',

  // --- Mini-lessons and results lists ---
  miniLessonsSubtitle: '{count} aralin ang na-unlock mula sa tamang sagot mo sa Quiz at Jigsaw Puzzle',
  noMiniLessonsYet: 'Wala ka pang na-unlock na mini-lesson. Sagutan nang tama ang isang Quiz o Jigsaw Puzzle sa Categories para makapag-unlock ng aralin dito.',
  levelActivityLine: 'Level {level} · Aktibidad {num}',
  quizResultsSubtitle: '{count} tamang sagot · {points} kabuuang puntos',
  jigsawResultsSubtitle: '{count} nabuong puzzle · {points} kabuuang puntos',
  noQuizResultsYet: 'Wala ka pang natatapos na Quiz. Pumunta sa Categories at subukan ang isang Quiz activity para makita dito ang resulta mo.',
  noJigsawResultsYet: 'Wala ka pang natatapos na Jigsaw Puzzle. Pumunta sa Categories at buuin ang isang puzzle para makita dito ang resulta mo.',
  secondsSuffix: '{seconds}s',

  // --- Student leaderboard extras ---
  leaderboardSubtitle: '{count} estudyanteng may resulta',
  youSuffix: ' (Ikaw)',
  trophyOfTier: 'tropeong {tier}',
  legendMaxPossible: 'Max posible: {points} puntos sa {seconds} sec (Quiz + Jigsaw, lahat ng level)',
  rowStatsLine: '{points} puntos · {time} · {attempts} gawain',
  legendPointsTimeLabel: '{points}+ puntos · {time}',

  // --- Student summary extras ---
  avgSuffix: '({avg} avg)',
  viewSummaryToggle: 'Buod (Category/Level)',
  viewHistoryToggle: 'Kasaysayan (Lahat ng Gawain)',
  historyRowLine: 'Level {level} · Aktibidad {num} · {date}',
  categoryTotalsLine: '{points} puntos · {attempts} gawain',
  passedOfSix: '{passed}/6',

  // --- Performance progression extras ---
  performanceSubtitle: 'Hinahambing ang unang mga sagot laban sa pinakabagong mga sagot para makita kung sino ang umuunlad.',
  levelChipShort: 'Lvl {n}',
  noAttemptsInCategory: 'Wala pang sinagutang gawain sa {category}.',
  noAttemptsAtAll: 'Wala pang sinagutang gawain.',

  // --- Admin content manager extras ---
  answerLabelShort: 'Sagot: {answer}',
  miniLessonToggleDesc: 'Kapag naka-ON, makikita ng mag-aaral ang mini-lesson bago sumagot sa bawat tanong.',
  miniLessonToggleNote: 'Tandaan: kasalukuyang naaapektuhan lang nito ang Global Library — hindi pa ito nakikita ng mga estudyanteng gumagamit ng ibang pack.',

  // --- Pack list extras ---
  packVersionMeta: 'v{version} · {usage}',

  // --- Question editor extras ---
  questionEditorTitle: '{label} — Level {level}, Aktibidad {num}',
  requiredAnswersNote: 'Ito ang magiging bilang ng "tabs" / input boxes na makikita ng player. Dapat hindi lumampas sa laki ng Answer Pool sa ibaba.',
  answerPoolLabel: 'Answer Pool (min. {min} posibleng sagot)',
  poolFilledCount: '{count} napunuan',
  acceptedCount: '{count}/{max}',
  acceptedAnswersNote: 'Opsyonal. Ibang paraan ng pagsulat ng parehong sagot (hal. ibang baybay) na ituturing ding tama.',
  lessonImageNote: 'Makikita ito sa Mini-Lessons kapag natapos na ng mag-aaral ang gawain. Hindi ito lumalabas habang sinasagot ang tanong, para hindi maibigay ang sagot.',
  noLessonImage: 'Walang larawan — gagamitin ang default na larawan ng kategorya.',

  // --- Settings language switcher ---
  languageLabel: 'Wika',
};

const translations = { en, tl };

export const LANGUAGES: Language[] = ['en', 'tl'];

/**
 * The language the provider last rendered, mirrored outside React so modules
 * that cannot hold a hook — the API client, which throws from inside `fetch`
 * — can still resolve a key. The provider is the only writer.
 */
let activeLanguage: Language = 'en';

/** `t()` for non-React callers. Prefer `useLanguage().t` inside components. */
export function translate(key: TranslationKey, vars?: Record<string, string | number>): string {
  let text: string = translations[activeLanguage][key] ?? en[key] ?? key;
  if (vars) {
    for (const k of Object.keys(vars)) {
      text = text.split(`{${k}}`).join(String(vars[k]));
    }
  }
  return text;
}

function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'tl';
}

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  /** False until the stored choice has been read back from AsyncStorage. */
  ready: boolean;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [ready, setReady] = useState(false);

  // Hydrate the previous choice. Until this resolves the app renders in
  // English, so screens that care (the splash gate) wait on `ready`.
  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (cancelled) return;
        if (isLanguage(stored)) {
          activeLanguage = stored;
          setLanguageState(stored);
        }
      })
      .catch(() => {
        // A storage read that fails just means we start in English.
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirrors the rendered language for `translate()`. `setLanguage` already
  // updates it eagerly; this keeps the two in step for any other path that
  // changes `language`, and stays out of render so it is not a render side effect.
  useEffect(() => {
    activeLanguage = language;
  }, [language]);

  const value = useMemo<LanguageContextType>(() => {
    const setLanguage = (lang: Language) => {
      activeLanguage = lang;
      setLanguageState(lang);
      AsyncStorage.setItem(STORAGE_KEY, lang).catch(() => {
        // Persisting is best-effort; the in-memory choice still applies.
      });
    };

    // Reads `language` (not `activeLanguage`) so React re-renders drive it.
    const t = (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text: string = translations[language][key] ?? en[key] ?? key;
      if (vars) {
        for (const k of Object.keys(vars)) {
          text = text.split(`{${k}}`).join(String(vars[k]));
        }
      }
      return text;
    };

    return { language, setLanguage, ready, t };
  }, [language, ready]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
