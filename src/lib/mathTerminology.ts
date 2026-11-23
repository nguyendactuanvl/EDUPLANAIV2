import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Packer,
  ShadingType,
  VerticalAlign,
  convertMillimetersToTwip,
} from 'docx';

export interface MathTermEntry {
  vi: string;
  en: string;
  phonetic?: string;
  category: string;
}

export const CORE_MATH_TERMINOLOGY: MathTermEntry[] = [
  // Hàm số & Giải tích (Calculus & Functions)
  { vi: 'Hàm số', en: 'Function', phonetic: '/ˈfʌŋkʃən/', category: 'Giải tích' },
  { vi: 'Tập xác định', en: 'Domain', phonetic: '/dəʊˈmeɪn/', category: 'Giải tích' },
  { vi: 'Tập giá trị', en: 'Range / Codomain', phonetic: '/reɪndʒ/ /ˌkəʊdəʊˈmeɪn/', category: 'Giải tích' },
  { vi: 'Điều kiện xác định', en: 'Validity condition / Domain restriction', phonetic: '/vəˈlɪdəti kənˈdɪʃən/ /dəʊˈmeɪn rɪˈstrɪkʃən/', category: 'Giải tích' },
  { vi: 'Hàm số đồng biến', en: 'Strictly increasing function', phonetic: '/ˈstrɪktli ɪnˈkriːsɪŋ ˈfʌŋkʃən/', category: 'Giải tích' },
  { vi: 'Hàm số nghịch biến', en: 'Strictly decreasing function', phonetic: '/ˈstrɪktli dɪˈkriːsɪŋ ˈfʌŋkʃən/', category: 'Giải tích' },
  { vi: 'Đơn điệu', en: 'Monotonicity', phonetic: '/ˌmɒnətəˈnɪsəti/', category: 'Giải tích' },
  { vi: 'Đạo hàm', en: 'Derivative', phonetic: '/dɪˈrɪvətɪv/', category: 'Giải tích' },
  { vi: 'Đạo hàm cấp hai', en: 'Second derivative', phonetic: '/ˈsekənd dɪˈrɪvətɪv/', category: 'Giải tích' },
  { vi: 'Cực trị', en: 'Extrema / Critical point', phonetic: '/ɪkˈstriːmə/ /ˈkrɪtɪkəl pɔɪnt/', category: 'Giải tích' },
  { vi: 'Cực đại', en: 'Local maximum', phonetic: '/ˈləʊkəl ˈmæksɪməm/', category: 'Giải tích' },
  { vi: 'Cực tiểu', en: 'Local minimum', phonetic: '/ˈləʊkəl ˈmɪnɪməm/', category: 'Giải tích' },
  { vi: 'Giá trị lớn nhất (GTLN)', en: 'Global maximum / Absolute maximum', phonetic: '/ˈɡləʊbəl ˈmæksɪməm/ /ˈæbsəluːt ˈmæksɪməm/', category: 'Giải tích' },
  { vi: 'Giá trị nhỏ nhất (GTNN)', en: 'Global minimum / Absolute minimum', phonetic: '/ˈɡləʊbəl ˈmɪnɪməm/ /ˈæbsəluːt ˈmɪnɪməm/', category: 'Giải tích' },
  { vi: 'Tiệm cận đứng', en: 'Vertical asymptote', phonetic: '/ˈvɜːtɪkəl ˈæsɪmptəʊt/', category: 'Giải tích' },
  { vi: 'Tiệm cận ngang', en: 'Horizontal asymptote', phonetic: '/ˌhɒrɪˈzɒntəl ˈæsɪmptəʊt/', category: 'Giải tích' },
  { vi: 'Tiệm cận xiên', en: 'Oblique / Slant asymptote', phonetic: '/əˈbliːk/ /slɑːnt ˈæsɪmptəʊt/', category: 'Giải tích' },
  { vi: 'Bảng biến thiên', en: 'Variation table / Sign chart', phonetic: '/ˌveəriˈeɪʃən ˈteɪbəl/ /saɪn tʃɑːt/', category: 'Giải tích' },
  { vi: 'Đồ thị hàm số', en: 'Graph of the function', phonetic: '/ɡrɑːf əv ðə ˈfʌŋkʃən/', category: 'Giải tích' },
  { vi: 'Điểm uốn', en: 'Inflection point', phonetic: '/ɪnˈflekʃən pɔɪnt/', category: 'Giải tích' },
  { vi: 'Tiếp tuyến', en: 'Tangent line', phonetic: '/ˈtændʒənt laɪn/', category: 'Giải tích' },
  { vi: 'Giới hạn', en: 'Limit', phonetic: '/ˈlɪmɪt/', category: 'Giải tích' },
  { vi: 'Hàm số liên tục', en: 'Continuous function', phonetic: '/kənˈtɪnjuəs ˈfʌŋkʃən/', category: 'Giải tích' },
  { vi: 'Nguyên hàm', en: 'Antiderivative / Indefinite integral', phonetic: '/ˌæntidɪˈrɪvətɪv/ /ɪnˈdefɪnət ˈɪntɪɡrəl/', category: 'Giải tích' },
  { vi: 'Tích phân', en: 'Definite integral', phonetic: '/ˈdefɪnət ˈɪntɪɡrəl/', category: 'Giải tích' },
  { vi: 'Phương pháp đổi biến số', en: 'Integration by substitution', phonetic: '/ˌɪntɪˈɡreɪʃən baɪ ˌsʌbstɪˈtjuːʃən/', category: 'Giải tích' },
  { vi: 'Tích phân từng phần', en: 'Integration by parts', phonetic: '/ˌɪntɪˈɡreɪʃən baɪ pɑːts/', category: 'Giải tích' },

  // Đại số & Số học (Algebra & Number Theory)
  { vi: 'Phương trình', en: 'Equation', phonetic: '/ɪˈkweɪʒən/', category: 'Đại số' },
  { vi: 'Phương trình bậc hai', en: 'Quadratic equation', phonetic: '/kwɒˈdrætɪk ɪˈkweɪʒən/', category: 'Đại số' },
  { vi: 'Bất phương trình', en: 'Inequality', phonetic: '/ˌɪnɪˈkwɒləti/', category: 'Đại số' },
  { vi: 'Hệ phương trình', en: 'System of equations', phonetic: '/ˈsɪstəm əv ɪˈkweɪʒənz/', category: 'Đại số' },
  { vi: 'Nghiệm', en: 'Root / Solution', phonetic: '/ruːt/ /səˈluːʃən/', category: 'Đại số' },
  { vi: 'Nghiệm duy nhất', en: 'Unique solution', phonetic: '/juːˈniːk səˈluːʃən/', category: 'Đại số' },
  { vi: 'Vô nghiệm', en: 'No solution', phonetic: '/nəʊ səˈluːʃən/', category: 'Đại số' },
  { vi: 'Nghiệm ngoại lai', en: 'Extraneous root', phonetic: '/ɪkˈstreɪniəs ruːt/', category: 'Đại số' },
  { vi: 'Bất đẳng thức', en: 'Inequality (relation)', phonetic: '/ˌɪnɪˈkwɒləti (rɪˈleɪʃən)/', category: 'Đại số' },
  { vi: 'Tham số', en: 'Parameter', phonetic: '/pəˈræmɪtə(r)/', category: 'Đại số' },
  { vi: 'Hệ số', en: 'Coefficient', phonetic: '/ˌkəʊɪˈfɪʃənt/', category: 'Đại số' },
  { vi: 'Hằng số', en: 'Constant', phonetic: '/ˈkɒnstənt/', category: 'Đại số' },
  { vi: 'Đa thức', en: 'Polynomial', phonetic: '/ˌpɒliˈnəʊmiəl/', category: 'Đại số' },
  { vi: 'Biểu thức', en: 'Expression', phonetic: '/ɪkˈspreʃən/', category: 'Đại số' },
  { vi: 'Rút gọn biểu thức', en: 'Simplify the expression', phonetic: '/ˈsɪmplɪfaɪ ði ɪkˈspreʃən/', category: 'Đại số' },
  { vi: 'Phân thức đại số', en: 'Rational expression', phonetic: '/ˈræʃənəl ɪkˈspreʃən/', category: 'Đại số' },
  { vi: 'Tử số', en: 'Numerator', phonetic: '/ˈnjuːməreɪtə(r)/', category: 'Đại số' },
  { vi: 'Mẫu số', en: 'Denominator', phonetic: '/dɪˈnɒmɪneɪtə(r)/', category: 'Đại số' },
  { vi: 'Lũy thừa', en: 'Exponent / Power', phonetic: '/ɪkˈspəʊnənt/ /ˈpaʊə(r)/', category: 'Đại số' },
  { vi: 'Căn bậc hai', en: 'Square root', phonetic: '/skweə(r) ruːt/', category: 'Đại số' },
  { vi: 'Lôgarit tự nhiên', en: 'Natural logarithm', phonetic: '/ˈnætʃərəl ˈlɒɡərɪðəm/', category: 'Đại số' },
  { vi: 'Số nguyên', en: 'Integer', phonetic: '/ˈɪntɪdʒə(r)/', category: 'Số học' },
  { vi: 'Số nguyên tố', en: 'Prime number', phonetic: '/praɪm ˈnʌmbə(r)/', category: 'Số học' },
  { vi: 'Chia hết', en: 'Divisible by', phonetic: '/dɪˈvɪzəbəl baɪ/', category: 'Số học' },
  { vi: 'Số dư', en: 'Remainder', phonetic: '/rɪˈmeɪndə(r)/', category: 'Số học' },
  { vi: 'Số chính phương', en: 'Perfect square', phonetic: '/ˈpɜːfɪkt skweə(r)/', category: 'Số học' },
  { vi: 'Dãy số', en: 'Sequence', phonetic: '/ˈsiːkwəns/', category: 'Đại số' },
  { vi: 'Cấp số cộng', en: 'Arithmetic progression', phonetic: '/ˌærɪθˈmetɪk prəˈɡreʃən/', category: 'Đại số' },
  { vi: 'Cấp số nhân', en: 'Geometric progression', phonetic: '/ˌdʒiːəˈmetrɪk prəˈɡreʃən/', category: 'Đại số' },
  { vi: 'Số hạng tổng quát', en: 'General term', phonetic: '/ˈdʒenərəl tɜːm/', category: 'Đại số' },
  { vi: 'Công sai', en: 'Common difference', phonetic: '/ˈkɒmən ˈdɪfrəns/', category: 'Đại số' },
  { vi: 'Công bội', en: 'Common ratio', phonetic: '/ˈkɒmən ˈreɪʃiəʊ/', category: 'Đại số' },
  { vi: 'Hàm số lượng giác', en: 'Trigonometric function', phonetic: '/ˌtrɪɡənəˈmetrɪk ˈfʌŋkʃən/', category: 'Lượng giác' },
  { vi: 'Định lý Côsin', en: 'Law of Cosines', phonetic: '/lɔː əv ˈkəʊsaɪnz/', category: 'Lượng giác' },
  { vi: 'Định lý Sin', en: 'Law of Sines', phonetic: '/lɔː əv saɪnz/', category: 'Lượng giác' },

  // Tổ hợp & Xác suất & Thống kê (Combinatorics, Probability & Statistics)
  { vi: 'Không gian mẫu', en: 'Sample space', phonetic: '/ˈsɑːmpəl speɪs/', category: 'Xác suất' },
  { vi: 'Biến cố', en: 'Event', phonetic: '/ɪˈvent/', category: 'Xác suất' },
  { vi: 'Biến cố đối', en: 'Complementary event', phonetic: '/ˌkɒmplɪˈmentəri ɪˈvent/', category: 'Xác suất' },
  { vi: 'Xác suất', en: 'Probability', phonetic: '/ˌprɒbəˈbɪləti/', category: 'Xác suất' },
  { vi: 'Xác suất có điều kiện', en: 'Conditional probability', phonetic: '/kənˈdɪʃənəl ˌprɒbəˈbɪləti/', category: 'Xác suất' },
  { vi: 'Hoán vị', en: 'Permutation', phonetic: '/ˌpɜːmjuˈteɪʃən/', category: 'Tổ hợp' },
  { vi: 'Chỉnh hợp', en: 'Variation / k-permutation', phonetic: '/ˌveəriˈeɪʃən/ /keɪ ˌpɜːmjuˈteɪʃən/', category: 'Tổ hợp' },
  { vi: 'Tổ hợp', en: 'Combination', phonetic: '/ˌkɒmbɪˈneɪʃən/', category: 'Tổ hợp' },
  { vi: 'Nhị thức Newton', en: 'Binomial theorem', phonetic: '/baɪˈnəʊmiəl ˈθɪərəm/', category: 'Tổ hợp' },
  { vi: 'Giá trị trung bình', en: 'Mean / Average', phonetic: '/miːn/ /ˈævərɪdʒ/', category: 'Thống kê' },
  { vi: 'Phương sai', en: 'Variance', phonetic: '/ˈveəriəns/', category: 'Thống kê' },
  { vi: 'Độ lệch chuẩn', en: 'Standard deviation', phonetic: '/ˈstændəd ˌdiːviˈeɪʃən/', category: 'Thống kê' },

  // Hình học & Tọa độ (Geometry & Vectors)
  { vi: 'Tam giác', en: 'Triangle', phonetic: '/ˈtraɪæŋɡəl/', category: 'Hình học' },
  { vi: 'Tam giác vuông', en: 'Right triangle', phonetic: '/raɪt ˈtraɪæŋɡəl/', category: 'Hình học' },
  { vi: 'Tam giác đều', en: 'Equilateral triangle', phonetic: '/ˌiːkwɪˈlætərəl ˈtraɪæŋɡəl/', category: 'Hình học' },
  { vi: 'Tam giác cân', en: 'Isosceles triangle', phonetic: '/aɪˈsɒsəliːz ˈtraɪæŋɡəl/', category: 'Hình học' },
  { vi: 'Cạnh huyền', en: 'Hypotenuse', phonetic: '/haɪˈpɒtənjuːz/', category: 'Hình học' },
  { vi: 'Đường cao', en: 'Altitude / Height', phonetic: '/ˈæltɪtjuːd/ /haɪt/', category: 'Hình học' },
  { vi: 'Đường trung tuyến', en: 'Median', phonetic: '/ˈmiːdiən/', category: 'Hình học' },
  { vi: 'Đường phân giác', en: 'Angle bisector', phonetic: '/ˈæŋɡəl baɪˈsektə(r)/', category: 'Hình học' },
  { vi: 'Đường trung trực', en: 'Perpendicular bisector', phonetic: '/ˌpɜːpənˈdɪkjələ(r) baɪˈsektə(r)/', category: 'Hình học' },
  { vi: 'Đường tròn', en: 'Circle', phonetic: '/ˈsɜːkəl/', category: 'Hình học' },
  { vi: 'Bán kính', en: 'Radius', phonetic: '/ˈreɪdiəs/', category: 'Hình học' },
  { vi: 'Đường kính', en: 'Diameter', phonetic: '/daɪˈæmɪtə(r)/', category: 'Hình học' },
  { vi: 'Dây cung', en: 'Chord', phonetic: '/kɔːd/', category: 'Hình học' },
  { vi: 'Chu vi', en: 'Perimeter', phonetic: '/pəˈrɪmɪtə(r)/', category: 'Hình học' },
  { vi: 'Diện tích', en: 'Area', phonetic: '/ˈeəriə/', category: 'Hình học' },
  { vi: 'Đường tròn ngoại tiếp', en: 'Circumscribed circle (Circumcircle)', phonetic: '/ˈsɜːkəmskraɪbd ˈsɜːkəl/', category: 'Hình học' },
  { vi: 'Đường tròn nội tiếp', en: 'Inscribed circle (Incircle)', phonetic: '/ɪnˈskraɪbd ˈsɜːkəl/', category: 'Hình học' },
  { vi: 'Song song', en: 'Parallel', phonetic: '/ˈpærəlel/', category: 'Hình học' },
  { vi: 'Vuông góc', en: 'Perpendicular', phonetic: '/ˌpɜːpənˈdɪkjələ(r)/', category: 'Hình học' },
  { vi: 'Giao điểm', en: 'Intersection point', phonetic: '/ˌɪntəˈsekʃən pɔɪnt/', category: 'Hình học' },
  { vi: 'Hình chiếu vuông góc', en: 'Orthogonal projection', phonetic: '/ɔːˈθɒɡənəl prəˈdʒekʃən/', category: 'Hình học' },
  { vi: 'Hai tam giác đồng dạng', en: 'Similar triangles', phonetic: '/ˈsɪmɪlə(r) ˈtraɪæŋɡəlz/', category: 'Hình học' },
  { vi: 'Hai tam giác bằng nhau', en: 'Congruent triangles', phonetic: '/ˈkɒŋɡruənt ˈtraɪæŋɡəlz/', category: 'Hình học' },
  { vi: 'Hệ trục tọa độ', en: 'Coordinate system', phonetic: '/kəʊˈɔːdɪnət ˈsɪstəm/', category: 'Hình học' },
  { vi: 'Hình chóp', en: 'Pyramid', phonetic: '/ˈpɪrəmɪd/', category: 'Hình học không gian' },
  { vi: 'Hình lăng trụ', en: 'Prism', phonetic: '/ˈprɪzəm/', category: 'Hình học không gian' },
  { vi: 'Mặt cầu', en: 'Sphere', phonetic: '/sfɪə(r)/', category: 'Hình học không gian' },
  { vi: 'Hình trụ', en: 'Cylinder', phonetic: '/ˈsɪlɪndə(r)/', category: 'Hình học không gian' },
  { vi: 'Hình nón', en: 'Cone', phonetic: '/kəʊn/', category: 'Hình học không gian' },
  { vi: 'Góc nhị diện', en: 'Dihedral angle', phonetic: '/daɪˈhiːdrəl ˈæŋɡəl/', category: 'Hình học không gian' },
  { vi: 'Thể tích', en: 'Volume', phonetic: '/ˈvɒljuːm/', category: 'Hình học không gian' },
  { vi: 'Diện tích toàn phần', en: 'Total surface area', phonetic: '/ˈtəʊtəl ˈsɜːfɪs ˈeəriə/', category: 'Hình học không gian' },
  { vi: 'Vectơ pháp tuyến', en: 'Normal vector', phonetic: '/ˈnɔːməl ˈvektə(r)/', category: 'Hình học Oxyz' },
  { vi: 'Vectơ chỉ phương', en: 'Direction vector', phonetic: '/daɪˈrekʃən ˈvektə(r)/', category: 'Hình học Oxyz' },
  { vi: 'Tích vô hướng', en: 'Dot product / Scalar product', phonetic: '/dɒt ˈprɒdʌkt/ /ˈskeɪlə(r) ˈprɒdʌkt/', category: 'Hình học Oxyz' },
  { vi: 'Tích có hướng', en: 'Cross product / Vector product', phonetic: '/krɒs ˈprɒdʌkt/ /ˈvektə(r) ˈprɒdʌkt/', category: 'Hình học Oxyz' },
  { vi: 'Điều kiện cần và đủ', en: 'Necessary and sufficient condition', phonetic: '/ˈnesəsəri ənd səˈfɪʃənt kənˈdɪʃən/', category: 'Chứng minh' },
  { vi: 'Chứng minh phản chứng', en: 'Proof by contradiction', phonetic: '/pruːf baɪ ˌkɒntrəˈdɪkʃən/', category: 'Chứng minh' },
];

const MATH_WORD_IPA_LEXICON: Record<string, string> = {
  function: 'ˈfʌŋkʃən',
  functions: 'ˈfʌŋkʃənz',
  domain: 'dəʊˈmeɪn',
  range: 'reɪndʒ',
  derivative: 'dɪˈrɪvətɪv',
  integral: 'ˈɪntɪɡrəl',
  limit: 'ˈlɪmɪt',
  continuous: 'kənˈtɪnjuəs',
  equation: 'ɪˈkweɪʒən',
  equations: 'ɪˈkweɪʒənz',
  inequality: 'ˌɪnɪˈkwɒləti',
  inequalities: 'ˌɪnɪˈkwɒlətiz',
  system: 'ˈsɪstəm',
  root: 'ruːt',
  roots: 'ruːts',
  solution: 'səˈluːʃən',
  solutions: 'səˈluːʃənz',
  set: 'set',
  feasible: 'ˈfiːzəbəl',
  region: 'ˈriːdʒən',
  linear: 'ˈlɪniə(r)',
  quadratic: 'kwɒˈdrætɪk',
  cubic: 'ˈkjuːbɪk',
  polynomial: 'ˌpɒliˈnəʊmiəl',
  expression: 'ɪkˈspreʃən',
  parameter: 'pəˈræmɪtə(r)',
  coefficient: 'ˌkəʊɪˈfɪʃənt',
  constant: 'ˈkɒnstənt',
  variable: 'ˈveəriəbəl',
  variables: 'ˈveəriəbəlz',
  real: 'rɪəl',
  number: 'ˈnʌmbə(r)',
  numbers: 'ˈnʌmbəz',
  integer: 'ˈɪntɪdʒə(r)',
  integers: 'ˈɪntɪdʒəz',
  natural: 'ˈnætʃərəl',
  rational: 'ˈræʃənəl',
  irrational: 'ɪˈræʃənəl',
  complex: 'ˈkɒmpleks',
  prime: 'praɪm',
  positive: 'ˈpɒzətɪv',
  negative: 'ˈneɡətɪv',
  value: 'ˈvæljuː',
  values: 'ˈvæljuːz',
  maximum: 'ˈmæksɪməm',
  minimum: 'ˈmɪnɪməm',
  local: 'ˈləʊkəl',
  global: 'ˈɡləʊbəl',
  absolute: 'ˈæbsəluːt',
  extrema: 'ɪkˈstriːmə',
  extremum: 'ɪkˈstriːməm',
  asymptote: 'ˈæsɪmptəʊt',
  vertical: 'ˈvɜːtɪkəl',
  horizontal: 'ˌhɒrɪˈzɒntəl',
  oblique: 'əˈbliːk',
  slant: 'slɑːnt',
  graph: 'ɡrɑːf',
  curve: 'kɜːv',
  line: 'laɪn',
  straight: 'streɪt',
  tangent: 'ˈtændʒənt',
  normal: 'ˈnɔːməl',
  plane: 'pleɪn',
  space: 'speɪs',
  point: 'pɔɪnt',
  points: 'pɔɪnts',
  origin: 'ˈɒrɪdʒɪn',
  axis: 'ˈæksɪs',
  axes: 'ˈæksiːz',
  coordinate: 'kəʊˈɔːdɪnət',
  coordinates: 'kəʊˈɔːdɪnəts',
  vector: 'ˈvektə(r)',
  vectors: 'ˈvektəz',
  scalar: 'ˈskeɪlə(r)',
  product: 'ˈprɒdʌkt',
  sum: 'sʌm',
  difference: 'ˈdɪfrəns',
  ratio: 'ˈreɪʃiəʊ',
  fraction: 'ˈfrækʃən',
  numerator: 'ˈnjuːməreɪtə(r)',
  denominator: 'dɪˈnɒmɪneɪtə(r)',
  square: 'skweə(r)',
  cube: 'kjuːb',
  power: 'ˈpaʊə(r)',
  exponent: 'ɪkˈspəʊnənt',
  exponential: 'ˌekspəˈnenʃəl',
  logarithm: 'ˈlɒɡərɪðəm',
  logarithmic: 'ˌlɒɡəˈrɪðmɪk',
  triangle: 'ˈtraɪæŋɡəl',
  triangles: 'ˈtraɪæŋɡəlz',
  right: 'raɪt',
  equilateral: 'ˌiːkwɪˈlætərəl',
  isosceles: 'aɪˈsɒsəliːz',
  angle: 'ˈæŋɡəl',
  angles: 'ˈæŋɡəlz',
  side: 'saɪd',
  sides: 'saɪdz',
  edge: 'edʒ',
  vertex: 'ˈvɜːteks',
  vertices: 'ˈvɜːtɪsiːz',
  circle: 'ˈsɜːkəl',
  radius: 'ˈreɪdiəs',
  diameter: 'daɪˈæmɪtə(r)',
  perimeter: 'pəˈrɪmɪtə(r)',
  area: 'ˈeəriə',
  surface: 'ˈsɜːfɪs',
  volume: 'ˈvɒljuːm',
  height: 'haɪt',
  altitude: 'ˈæltɪtjuːd',
  base: 'beɪs',
  median: 'ˈmiːdiən',
  bisector: 'baɪˈsektə(r)',
  midpoint: 'ˈmɪdpɔɪnt',
  centroid: 'ˈsentrɔɪd',
  parallel: 'ˈpærəlel',
  perpendicular: 'ˌpɜːpənˈdɪkjələ(r)',
  orthogonal: 'ɔːˈθɒɡənəl',
  projection: 'prəˈdʒekʃən',
  intersection: 'ˌɪntəˈsekʃən',
  distance: 'ˈdɪstəns',
  length: 'leŋθ',
  pyramid: 'ˈpɪrəmɪd',
  prism: 'ˈprɪzəm',
  sphere: 'sfɪə(r)',
  cylinder: 'ˈsɪlɪndə(r)',
  cone: 'kəʊn',
  tetrahedron: 'ˌtetrəˈhiːdrən',
  polygon: 'ˈpɒliɡɒn',
  quadrilateral: 'ˌkwɒdrɪˈlætərəl',
  parallelogram: 'ˌpærəˈleləɡræm',
  rectangle: 'ˈrektæŋɡəl',
  trapezoid: 'ˈtræpəzɔɪd',
  rhombus: 'ˈrɒmbəs',
  sine: 'saɪn',
  cosine: 'ˈkəʊsaɪn',
  trigonometric: 'ˌtrɪɡənəˈmetrɪk',
  probability: 'ˌprɒbəˈbɪləti',
  event: 'ɪˈvent',
  sample: 'ˈsɑːmpəl',
  permutation: 'ˌpɜːmjuˈteɪʃən',
  combination: 'ˌkɒmbɪˈneɪʃən',
  mean: 'miːn',
  variance: 'ˈveəriəns',
  standard: 'ˈstændəd',
  deviation: 'ˌdiːviˈeɪʃən',
  sequence: 'ˈsiːkwəns',
  series: 'ˈsɪəriːz',
  arithmetic: 'ˌærɪθˈmetɪk',
  geometric: 'ˌdʒiːəˈmetrɪk',
  progression: 'prəˈɡreʃən',
  term: 'tɜːm',
  common: 'ˈkɒmən',
  matrix: 'ˈmeɪtrɪks',
  determinant: 'dɪˈtɜːmɪnənt',
  theorem: 'ˈθɪərəm',
  lemma: 'ˈlemə',
  formula: 'ˈfɔːmjələ',
  property: 'ˈprɒpəti',
  condition: 'kənˈdɪʃən',
  proof: 'pruːf',
  interval: 'ˈɪntəvəl',
  increasing: 'ɪnˈkriːsɪŋ',
  decreasing: 'dɪˈkriːsɪŋ',
  strictly: 'ˈstrɪktli',
  monotonic: 'ˌmɒnəˈtɒnɪk',
  symmetric: 'sɪˈmetrɪk',
  symmetry: 'ˈsɪmətri',
  inverse: 'ˈɪnvɜːs',
  composite: 'ˈkɒmpəzɪt',
  matrixes: 'ˈmeɪtrɪsiːz',
  of: 'əv',
  the: 'ðə',
  in: 'ɪn',
  on: 'ɒn',
  by: 'baɪ',
  to: 'tuː',
  and: 'ənd',
  with: 'wɪð',
  two: 'tuː',
  three: 'θriː',
  first: 'fɜːst',
  second: 'ˈsekənd',
  order: 'ˈɔːdə(r)',
  degree: 'dɪˈɡriː',
  step: 'step',
  method: 'ˈmeθəd',
  table: 'ˈteɪbəl',
  chart: 'tʃɑːt',
  sign: 'saɪn',
};

export function lookupMathTermPhonetic(en: string, vi?: string): string {
  const cleanEn = (en || '').trim();
  const cleanVi = (vi || '').trim().toLowerCase();
  if (!cleanEn) return '';

  const lowerEn = cleanEn.toLowerCase();
  const exact = CORE_MATH_TERMINOLOGY.find(
    (entry) =>
      entry.en.toLowerCase() === lowerEn ||
      (cleanVi && entry.vi.toLowerCase() === cleanVi)
  );
  if (exact?.phonetic) return exact.phonetic;

  const variantMatch = CORE_MATH_TERMINOLOGY.find((entry) => {
    const parts = entry.en
      .replace(/\([^)]*\)/g, '')
      .split('/')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    return parts.some((p) => p === lowerEn);
  });
  if (variantMatch?.phonetic) {
    const enParts = variantMatch.en.split('/').map((s) => s.trim().toLowerCase());
    const ipaParts = variantMatch.phonetic.split(/\/\s+\//);
    const idx = enParts.findIndex((p) => p.replace(/\([^)]*\)/g, '').trim() === lowerEn);
    if (idx >= 0 && ipaParts[idx]) {
      const part = ipaParts[idx].replace(/^\/|\/$/g, '').trim();
      if (part) return `/${part}/`;
    }
    return variantMatch.phonetic;
  }

  // Fallback: assemble IPA from built-in mathematical word lexicon if all words are recognized
  const primaryVariant = cleanEn.split('/')[0].replace(/\([^)]*\)/g, '').trim();
  const words = primaryVariant.toLowerCase().match(/[a-z]+/g);
  if (words && words.length > 0) {
    const mapped = words.map((w) => MATH_WORD_IPA_LEXICON[w]);
    const matchedCount = mapped.filter(Boolean).length;
    if (matchedCount === words.length) {
      return `/${mapped.join(' ')}/`;
    }
  }

  return '';
}

export function extractMatchedMathTerms(text: string): MathTermEntry[] {
  if (!text) return [];
  const normalized = text.toLowerCase();
  const matched: MathTermEntry[] = [];

  for (const entry of CORE_MATH_TERMINOLOGY) {
    const viKey = entry.vi.replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
    const enVariants = entry.en
      .replace(/\([^)]*\)/g, '')
      .split('/')
      .map(s => s.trim().toLowerCase())
      .filter(Boolean);

    const hasVi = viKey.length >= 3 && normalized.includes(viKey);
    const hasEn = enVariants.some(v => v.length >= 4 && normalized.includes(v));
    if (hasVi || hasEn) {
      matched.push(entry);
    }
  }

  return matched;
}

export function formatTerminologyMarkdownTable(terms: MathTermEntry[], heading: string = '## Bảng tổng hợp Thuật ngữ Toán học (Vocabulary Review)'): string {
  const safeTerms = terms.filter(t => t && t.vi && t.en);
  if (safeTerms.length === 0) return '';

  const rows = safeTerms.map((term, idx) => {
    const cleanVi = term.vi.replace(/\|/g, '/').trim();
    const cleanEn = term.en.replace(/\|/g, '/').trim();
    const resolvedPhonetic = (term.phonetic || lookupMathTermPhonetic(term.en, term.vi) || '—').replace(/\|/g, '/').trim();
    const cleanCat = (term.category || 'Toán học').replace(/\|/g, '/').trim();
    return `| ${idx + 1} | ${cleanVi} | **${cleanEn}** | ${resolvedPhonetic} | ${cleanCat} |`;
  });

  return [
    heading,
    '',
    '| STT | Thuật ngữ Tiếng Việt | Thuật ngữ Tiếng Anh (English Term) | Phiên âm Tiếng Anh (IPA) | Chuyên đề |',
    '| :---: | :--- | :--- | :--- | :---: |',
    ...rows,
  ].join('\n');
}

export async function exportMathTerminologyToDocx(
  terms: MathTermEntry[],
  options?: {
    fileName?: string;
    sourceTitle?: string;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;
  const safeTerms = terms.filter(t => t && t.vi && t.en);
  if (safeTerms.length === 0) return;

  const sourceTitle = options?.sourceTitle?.trim() || 'Bài tập Toán học Song ngữ';
  const dateLabel = new Date().toLocaleDateString('vi-VN');
  const fileName =
    options?.fileName ||
    `ThuatNgu_ToanAnhViet_${new Date().toISOString().slice(0, 10)}.docx`;

  const tableBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: 'CBD5E1',
  };

  const cellBorders = {
    top: tableBorder,
    bottom: tableBorder,
    left: tableBorder,
    right: tableBorder,
  };

  const cellMargins = {
    top: 100,
    bottom: 100,
    left: 120,
    right: 120,
  };

  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      new TableCell({
        width: { size: 7, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'STT',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 24, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'Thuật ngữ Tiếng Việt',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 27, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'Thuật ngữ Tiếng Anh',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 27, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.LEFT,
            children: [
              new TextRun({
                text: 'Phiên âm Tiếng Anh (IPA)',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          }),
        ],
      }),
      new TableCell({
        width: { size: 15, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, color: 'auto', fill: '0F766E' },
        verticalAlign: VerticalAlign.CENTER,
        borders: cellBorders,
        margins: cellMargins,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: 'Chuyên đề',
                bold: true,
                color: 'FFFFFF',
                font: 'Times New Roman',
                size: 21,
              }),
            ],
          }),
        ],
      }),
    ],
  });

  const bodyRows = safeTerms.map((term, idx) => {
    const rowFill = idx % 2 === 1 ? 'F0FDFA' : 'FFFFFF';
    const resolvedPhonetic = term.phonetic || lookupMathTermPhonetic(term.en, term.vi) || '—';
    return new TableRow({
      children: [
        new TableCell({
          width: { size: 7, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: String(idx + 1),
                  font: 'Times New Roman',
                  size: 21,
                  color: '334155',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 24, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: term.vi,
                  bold: true,
                  font: 'Times New Roman',
                  size: 22,
                  color: '0F172A',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 27, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: term.en,
                  bold: true,
                  font: 'Times New Roman',
                  size: 22,
                  color: '047857',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 27, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.LEFT,
              children: [
                new TextRun({
                  text: resolvedPhonetic,
                  italics: true,
                  font: 'Times New Roman',
                  size: 21,
                  color: '4338CA',
                }),
              ],
            }),
          ],
        }),
        new TableCell({
          width: { size: 15, type: WidthType.PERCENTAGE },
          shading: { type: ShadingType.CLEAR, color: 'auto', fill: rowFill },
          verticalAlign: VerticalAlign.CENTER,
          borders: cellBorders,
          margins: cellMargins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: term.category || 'Toán học',
                  italics: true,
                  font: 'Times New Roman',
                  size: 20,
                  color: '475569',
                }),
              ],
            }),
          ],
        }),
      ],
    });
  });

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(18),
              bottom: convertMillimetersToTwip(18),
              left: convertMillimetersToTwip(18),
              right: convertMillimetersToTwip(18),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'BẢNG TỔNG HỢP THUẬT NGỮ TOÁN HỌC ANH – VIỆT',
                bold: true,
                font: 'Times New Roman',
                size: 30,
                color: '0F766E',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 80 },
            children: [
              new TextRun({
                text: 'Tài liệu ôn tập từ vựng chuyên ngành Toán Tiếng Anh dành cho học sinh',
                italics: true,
                font: 'Times New Roman',
                size: 23,
                color: '475569',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.LEFT,
            spacing: { before: 80, after: 180 },
            children: [
              new TextRun({
                text: 'Nguồn bài tập: ',
                bold: true,
                font: 'Times New Roman',
                size: 22,
                color: '1E293B',
              }),
              new TextRun({
                text: `${sourceTitle}   |   `,
                font: 'Times New Roman',
                size: 22,
                color: '334155',
              }),
              new TextRun({
                text: 'Ngày xuất: ',
                bold: true,
                font: 'Times New Roman',
                size: 22,
                color: '1E293B',
              }),
              new TextRun({
                text: `${dateLabel}   |   `,
                font: 'Times New Roman',
                size: 22,
                color: '334155',
              }),
              new TextRun({
                text: 'Số lượng: ',
                bold: true,
                font: 'Times New Roman',
                size: 22,
                color: '1E293B',
              }),
              new TextRun({
                text: `${safeTerms.length} thuật ngữ`,
                font: 'Times New Roman',
                size: 22,
                color: '0F766E',
                bold: true,
              }),
            ],
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [headerRow, ...bodyRows],
          }),
          new Paragraph({
            spacing: { before: 220, after: 80 },
            children: [
              new TextRun({
                text: 'Gợi ý ôn tập nhanh: ',
                bold: true,
                font: 'Times New Roman',
                size: 22,
                color: '0F766E',
              }),
              new TextRun({
                text: 'Học sinh có thể che cột "English Math Term" để tự đọc và viết lại thuật ngữ Tiếng Anh tương ứng theo từng chuyên đề.',
                italics: true,
                font: 'Times New Roman',
                size: 22,
                color: '475569',
              }),
            ],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }, 1000);
}

// ============================================================================
// English Text-to-Speech (Web Speech API) for Math Terms & English Solutions
// ============================================================================

export type EnglishTtsAccent = 'en-GB' | 'en-US';

let activeSpeechSessionId = 0;

export function isEnglishTtsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    typeof SpeechSynthesisUtterance !== 'undefined'
  );
}

export function formatEnglishTermForSpeech(en: string): string {
  if (!en) return '';
  return en
    .replace(/\s*\/\s*/g, ', or ')
    .replace(/\s*\(([^)]+)\)/g, ', $1')
    .replace(/\bk-permutation\b/gi, 'k permutation')
    .replace(/\s+,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatEnglishSolutionForSpeech(markdown: string): string {
  if (!markdown) return '';
  let text = markdown
    .replace(/```tikz[\s\S]*?```/gi, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<img\b[^>]*>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');

  // Convert inner math constructs first so nested fractions like \frac{x^2 + 1}{\sqrt{x}} read cleanly
  text = text
    .replace(/\\text\s*\{([^{}]*)\}/g, ' $1 ')
    .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'square root of $1')
    .replace(/\^\s*\{?2\}?/g, ' squared')
    .replace(/\^\s*\{?3\}?/g, ' cubed')
    .replace(/\^\s*\{([^{}]+)\}/g, ' to the power of $1')
    .replace(/\\(?:d|t)?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 over $2')
    .replace(/\\(?:d|t)?frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '$1 over $2')
    .replace(/\\(?:leq|le|leqslant)(?![a-zA-Z])/g, ' is less than or equal to ')
    .replace(/\\(?:geq|ge|geqslant)(?![a-zA-Z])/g, ' is greater than or equal to ')
    .replace(/\\(?:neq|ne)(?![a-zA-Z])/g, ' is not equal to ')
    .replace(/\\approx(?![a-zA-Z])/g, ' is approximately equal to ')
    .replace(/\\pm(?![a-zA-Z])/g, ' plus or minus ')
    .replace(/\\times|\\cdot/g, ' times ')
    .replace(/\\div(?![a-zA-Z])/g, ' divided by ')
    .replace(/\\infty(?![a-zA-Z])/g, ' infinity ')
    .replace(/\\pi(?![a-zA-Z])/g, ' pi ')
    .replace(/\\sin(?![a-zA-Z])/g, ' sine ')
    .replace(/\\cos(?![a-zA-Z])/g, ' cosine ')
    .replace(/\\tan(?![a-zA-Z])/g, ' tangent ')
    .replace(/\\cot(?![a-zA-Z])/g, ' cotangent ')
    .replace(/\\ln(?![a-zA-Z])/g, ' natural log of ')
    .replace(/\\log(?![a-zA-Z])/g, ' log ')
    .replace(/\\(?:Leftrightarrow|iff)(?![a-zA-Z])/g, ', if and only if, ')
    .replace(/\\(?:Rightarrow|implies)(?![a-zA-Z])/g, ', therefore, ')
    .replace(/\\in(?![a-zA-Z])/g, ' belongs to ')
    .replace(/\\mathbb\s*\{R\}/g, ' real numbers ')
    .replace(/\\mathbb\s*\{Z\}/g, ' integers ')
    .replace(/\\mathbb\s*\{N\}/g, ' natural numbers ')
    .replace(/\\[a-zA-Z]+/g, ' ')
    .replace(/[\$\{\}\\\*#_`~|]/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

  return text;
}

function pickBestEnglishVoice(accent: EnglishTtsAccent): SpeechSynthesisVoice | null {
  if (!isEnglishTtsSupported()) return null;
  const voices = window.speechSynthesis.getVoices() || [];
  if (voices.length === 0) return null;

  const targetLower = accent.toLowerCase();
  const preferredNames =
    accent === 'en-GB'
      ? ['google uk english', 'sonia', 'libby', 'ryan', 'daniel', 'serena', 'kate', 'martha']
      : ['google us english', 'aria', 'jenny', 'guy', 'samantha', 'alex', 'zira', 'david'];

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const name = (v.name || '').toLowerCase();
    let score = 0;
    if (lang === targetLower) score += 100;
    else if (lang.startsWith(targetLower.split('-')[0])) score += 40;
    else return -1;

    if (preferredNames.some((kw) => name.includes(kw))) score += 50;
    if (name.includes('natural') || name.includes('neural') || name.includes('google')) score += 25;
    if (v.localService) score += 5;
    return score;
  };

  let best: SpeechSynthesisVoice | null = null;
  let bestScore = -1;
  for (const v of voices) {
    const s = scoreVoice(v);
    if (s > bestScore) {
      bestScore = s;
      best = v;
    }
  }
  return best;
}

function splitIntoSpeechChunks(text: string, maxLen = 200): string[] {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  if (clean.length <= maxLen) return [clean];

  const sentences = clean.split(/(?<=[.!?;:])\s+/);
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if (!sentence) continue;
    if (sentence.length > maxLen) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      const words = sentence.split(/\s+/);
      let sub = '';
      for (const w of words) {
        if ((sub + ' ' + w).trim().length > maxLen && sub) {
          chunks.push(sub.trim());
          sub = w;
        } else {
          sub = (sub ? sub + ' ' : '') + w;
        }
      }
      if (sub) chunks.push(sub.trim());
    } else if ((current + ' ' + sentence).trim().length > maxLen && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = (current ? current + ' ' : '') + sentence;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

export function stopEnglishSpeech(): void {
  activeSpeechSessionId++;
  if (!isEnglishTtsSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch (_) {}
}

export function speakEnglishText(
  text: string,
  options?: {
    accent?: EnglishTtsAccent;
    rate?: number;
    onEnd?: () => void;
    onError?: () => void;
  }
): boolean {
  if (!isEnglishTtsSupported()) {
    options?.onError?.();
    return false;
  }
  const chunks = splitIntoSpeechChunks(text);
  if (chunks.length === 0) {
    options?.onEnd?.();
    return false;
  }

  const sessionId = ++activeSpeechSessionId;
  const accent: EnglishTtsAccent = options?.accent || 'en-GB';
  const rate = typeof options?.rate === 'number' ? options.rate : 0.95;

  try {
    window.speechSynthesis.cancel();
  } catch (_) {}

  const voice = pickBestEnglishVoice(accent);
  let idx = 0;

  const speakNextChunk = () => {
    if (sessionId !== activeSpeechSessionId) return;
    if (idx >= chunks.length) {
      options?.onEnd?.();
      return;
    }
    const utter = new SpeechSynthesisUtterance(chunks[idx]);
    utter.lang = voice?.lang || accent;
    if (voice) utter.voice = voice;
    utter.rate = rate;
    utter.pitch = 1.0;

    utter.onend = () => {
      if (sessionId !== activeSpeechSessionId) return;
      idx++;
      speakNextChunk();
    };
    utter.onerror = (ev: any) => {
      if (sessionId !== activeSpeechSessionId) return;
      if (ev?.error === 'canceled' || ev?.error === 'interrupted') return;
      options?.onError?.();
    };

    try {
      window.speechSynthesis.speak(utter);
    } catch (_) {
      options?.onError?.();
    }
  };

  speakNextChunk();
  return true;
}

export function speakEnglishSequence(
  items: Array<{ key: string; text: string }>,
  options?: {
    accent?: EnglishTtsAccent;
    rate?: number;
    pauseMs?: number;
    onItemStart?: (key: string) => void;
    onDone?: () => void;
  }
): boolean {
  if (!isEnglishTtsSupported() || items.length === 0) {
    options?.onDone?.();
    return false;
  }

  const sessionId = ++activeSpeechSessionId;
  const accent: EnglishTtsAccent = options?.accent || 'en-GB';
  const rate = typeof options?.rate === 'number' ? options.rate : 0.92;
  const pauseMs = typeof options?.pauseMs === 'number' ? options.pauseMs : 420;

  try {
    window.speechSynthesis.cancel();
  } catch (_) {}

  const voice = pickBestEnglishVoice(accent);
  let idx = 0;

  const playNext = () => {
    if (sessionId !== activeSpeechSessionId) return;
    if (idx >= items.length) {
      options?.onDone?.();
      return;
    }
    const item = items[idx];
    const spoken = item.text.trim();
    if (!spoken) {
      idx++;
      playNext();
      return;
    }
    options?.onItemStart?.(item.key);
    const utter = new SpeechSynthesisUtterance(spoken);
    utter.lang = voice?.lang || accent;
    if (voice) utter.voice = voice;
    utter.rate = rate;
    utter.pitch = 1.0;

    utter.onend = () => {
      if (sessionId !== activeSpeechSessionId) return;
      idx++;
      if (idx < items.length) {
        setTimeout(() => {
          if (sessionId === activeSpeechSessionId) playNext();
        }, pauseMs);
      } else {
        options?.onDone?.();
      }
    };
    utter.onerror = (ev: any) => {
      if (sessionId !== activeSpeechSessionId) return;
      if (ev?.error === 'canceled' || ev?.error === 'interrupted') return;
      options?.onDone?.();
    };

    try {
      window.speechSynthesis.speak(utter);
    } catch (_) {
      options?.onDone?.();
    }
  };

  playNext();
  return true;
}

